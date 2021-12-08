import PageStateGenerator, {
  IPageStateGeneratorAssertionBatch,
} from '@ulixee/hero-timetravel/lib/PageStateGenerator';
import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { fork } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import { ITabEventParams } from '@ulixee/hero-core/lib/Tab';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import PageStateListener, { IPageStateEvents } from '@ulixee/hero-core/lib/PageStateListener';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import SessionObserver from './SessionObserver';
import CommandTimeline from '@ulixee/hero-timetravel/lib/CommandTimeline';
import IPageStateUpdateEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import PageStateCodeBlock from '@ulixee/hero-timetravel/lib/PageStateCodeBlock';
import PageStateAssertions from '@ulixee/hero-timetravel/lib/PageStateAssertions';
import DevtoolsPanelModule from './hero-plugin-modules/DevtoolsPanelModule';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import PageStateSessionTimeline from './PageStateSessionTimeline';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';

const { log } = Log(module);

export default class PageStateManager extends TypedEventEmitter<{
  updated: IPageStateUpdateEvent;
  unresolved: { pageStateId: string; heroSessionId: string; error?: Error };
  close: void;
  enter: { pageStateId: string };
  exit: void;
}> {
  public get generator(): PageStateGenerator {
    return this.pageStateById.get(this.activePageStateId)?.generator;
  }

  public get activeSessionTimeline(): PageStateSessionTimeline {
    return this.getHeroSessionTimeline(this.activeTimelineHeroSessionId);
  }

  private readonly pageStateById = new Map<
    string,
    {
      startingStates: string[];
      needsCodeChange: boolean;
      modifiedStates: Set<string>;
      generator: PageStateGenerator;
      heroSessionTimelinesById: Map<string, PageStateSessionTimeline>;
    }
  >();

  private readonly manuallyAssignedHeroSessionIds = new Set<string>();

  private activePageStateId: string;
  private isHeroSessionFocused = false;
  private activeTimelineHeroSessionId: string;
  private tabGroupId: number;
  private readonly openHeroSessionsById = new Map<string, HeroSession>();
  private timelineRecordersBySessionId = new Map<string, TimelineRecorder>();

  private placeholderSessions = 0;

  private timetravelPlayer: TimetravelPlayer;

  private readonly scriptInstanceMeta: IScriptInstanceMeta;

  // publishing debounce
  private lastPublish: number;
  private publishTimeout: NodeJS.Timeout;

  constructor(readonly sessionObserver: SessionObserver) {
    super();

    bindFunctions(this);
    const sourceHeroSession = sessionObserver.heroSession;
    this.scriptInstanceMeta = sourceHeroSession.options.scriptInstanceMeta;
    this.logger = log.createChild(module, {
      sessionId: sourceHeroSession.id,
    });
    this.trackHeroSession(sourceHeroSession, sessionObserver.timelineRecorder);
  }

  public getScreenshot(heroSessionId: string, tabId: number, timestamp: number): string {
    const timeline = this.getHeroSessionTimeline(heroSessionId);
    if (timeline) return timeline.timelineBuilder.getScreenshot(tabId, timestamp);
    const heroSession = this.openHeroSessionsById.get(heroSessionId);
    if (heroSession) {
      return heroSession.db.screenshots.getImage(tabId, timestamp)?.toString('base64');
    }
  }

  public getHeroSessionTimeline(heroSessionId: string): PageStateSessionTimeline {
    return this.pageStateById
      .get(this.activePageStateId)
      ?.heroSessionTimelinesById?.get(heroSessionId);
  }

  public async save(): Promise<{ code: string; needsCodeChange: boolean }> {
    const id = this.activePageStateId;

    const { needsCodeChange, generator } = this.pageStateById.get(id);
    const code = await PageStateCodeBlock.generateCodeBlock(
      generator,
      this.sessionObserver.scriptInstanceMeta,
    );
    return { needsCodeChange, code };
  }

  public async close(destroy = false): Promise<void> {
    this.emit(destroy ? 'close' : 'exit');
    for (const { generator } of this.pageStateById.values()) {
      await generator.close();
    }
    // don't clear generators or sessions in case we re-open
    if (destroy) {
      this.clear();
    }

    this.sessionObserver.tabGroupModule?.off('tab-group-opened', this.listenForTabGroupOpened);
    await this.closeTimetravel();
    if (this.tabGroupId) {
      this.tabGroupId = null;
      await this.sessionObserver.updateTabGroup(false);
    }
  }

  public addMultiverse(): void {
    const execArgv = ['--mode', 'multiverse'];

    const { entrypoint, workingDirectory } = this.scriptInstanceMeta;
    if (entrypoint.endsWith('.ts')) {
      execArgv.push('-r', 'ts-node/register');
    }

    try {
      this.placeholderSessions += 1;
      fork(entrypoint, execArgv, {
        cwd: workingDirectory,
        stdio: 'inherit',
        env: { ...process.env, HERO_CLI_NOPROMPT: 'true' },
      });
      if (this.activePageStateId) this.publish();
    } catch (error) {
      this.placeholderSessions -= 1;
      this.logger.error('ERROR running multiverse', { error });
    }
  }

  public onMultiverseSession(heroSession: HeroSession) {
    // not be our session
    if (heroSession.options.scriptInstanceMeta.entrypoint !== this.scriptInstanceMeta.entrypoint) {
      return;
    }
    heroSession.configureHeaded({ showBrowser: false });
    heroSession.options.sessionKeepAlive = false;
    heroSession.options.sessionResume = null;

    if (heroSession.mode === 'multiverse') {
      heroSession.db.keepAlive = true;
    }
    this.trackHeroSession(heroSession);
    this.placeholderSessions -= 1;
    if (this.activePageStateId) this.publish();
  }

  public async loadPageState(id: string): Promise<void> {
    this.emit('enter', { pageStateId: id });
    this.activePageStateId = id;

    const sessionIdToOpen =
      this.getUnresolvedHeroSessionIds()[0] ?? this.sessionObserver.heroSession.id;
    await this.openTimetravel(sessionIdToOpen);
    this.updateState();

    this.sessionObserver
      .groupTabs('', 'grey', true)
      .then(x => {
        this.tabGroupId = x;
        this.sessionObserver.tabGroupModule.on('tab-group-opened', this.listenForTabGroupOpened);
        return null;
      })
      .catch(console.error);

    await this.closeDevtoolsPanel(sessionIdToOpen);
  }

  public async focusSessionLoadingTimeBoundary(isStartTime: boolean): Promise<void> {
    const focusedSessionId = this.activeTimelineHeroSessionId;
    const session = this.generator.sessionsById.get(focusedSessionId);
    await this.timetravelTo(isStartTime ? session.loadingRange[0] : session.loadingRange[1]);
  }

  public async changeSessionLoadingTimeBoundary(
    percentOffset: number,
    isStartTime: boolean,
  ): Promise<void> {
    this.manuallyAssignedHeroSessionIds.add(this.activeTimelineHeroSessionId);
    const timestamp = this.activeSessionTimeline.changeLoadingRangeBoundary(
      percentOffset,
      isStartTime,
    );
    await this.timetravelTo(timestamp);

    const focusedSessionId = this.activeTimelineHeroSessionId;
    const modifiedState = this.generator.getStateForSessionId(focusedSessionId);
    if (modifiedState) {
      this.didMakeStateChanges(this.activePageStateId, modifiedState);
    }
    this.updateState();
  }

  public extendSessionTime(sessionId: string, millis: number): Promise<void> {
    this.manuallyAssignedHeroSessionIds.add(sessionId);

    const sessionTimeline = this.getHeroSessionTimeline(sessionId);
    sessionTimeline.extendTimelineRange(millis);
    // will update time in event from sessionTimeline

    return Promise.resolve();
  }

  public addState(name: string, ...heroSessionIds: string[]): void {
    for (const id of heroSessionIds) this.manuallyAssignedHeroSessionIds.add(id);
    this.generator.addState(name, ...heroSessionIds);
    this.didMakeStateChanges(this.activePageStateId, name);
    this.updateState();
  }

  public renameState(name: string, oldValue: string): void {
    const existing = this.generator.statesByName.get(oldValue);
    if (!existing) return;
    this.generator.statesByName.set(name, existing);
    this.generator.statesByName.delete(oldValue);
    this.didMakeStateChanges(this.activePageStateId, name);
    this.didMakeStateChanges(this.activePageStateId, oldValue);
    this.updateState();
  }

  public removeState(name: string): void {
    const existing = this.generator.statesByName.get(name);
    if (!existing) return;
    this.generator.statesByName.delete(name);
    this.didMakeStateChanges(this.activePageStateId, name);
    this.updateState();
  }

  public isShowingSession(heroSessionId: string): boolean {
    return this.activeSessionTimeline?.sessionId === heroSessionId;
  }

  public unfocusSession(): void {
    this.isHeroSessionFocused = false;
    this.publish();
  }

  public async openTimetravel(heroSessionId: string): Promise<void> {
    if (this.activeTimelineHeroSessionId === heroSessionId) {
      if (this.isHeroSessionFocused === false) {
        await this.gotoActiveSessionEnd();
      }
      this.isHeroSessionFocused = true;
      return;
    }

    // can't open yet
    if (!this.generator.sessionsById.has(heroSessionId)) return;

    const prevTimetravel = this.timetravelPlayer;
    if (prevTimetravel) {
      prevTimetravel.off('all-tabs-closed', this.onTimetravelTabsClosed);
    }

    this.activeTimelineHeroSessionId = heroSessionId;
    this.isHeroSessionFocused = true;
    this.timetravelPlayer = TimetravelPlayer.create(
      heroSessionId,
      // load into context of source hero
      this.sessionObserver.heroSession,
      this.generator.sessionsById.get(heroSessionId).timelineRange,
    );
    this.activeSessionTimeline.refreshMetadata();

    await Promise.all([this.gotoActiveSessionEnd(), prevTimetravel?.close()]);
    this.timetravelPlayer.once('all-tabs-closed', this.onTimetravelTabsClosed);
  }

  private listenForTabGroupOpened(openedGroupId: number) {
    const groupId = this.tabGroupId;
    // if still open, re-collapse
    if (groupId === openedGroupId && this.pageStateById.size) {
      this.sessionObserver.tabGroupModule
        .collapseGroup(this.sessionObserver.heroSession.getLastActiveTab().puppetPage, groupId)
        .catch(error => {
          this.logger.error('Error keeping live tabGroup collapsed', {
            error,
          });
        });
    }
  }

  private async timetravelTo(timestamp: number): Promise<void> {
    const offset = this.activeSessionTimeline.getTimelineOffset(timestamp);
    await this.timetravelPlayer.goto(offset, this.activeSessionTimeline.lastMetadata);
    this.publish();
  }

  private async gotoActiveSessionEnd(): Promise<void> {
    const sessionDetails = this.generator.sessionsById.get(this.activeTimelineHeroSessionId);
    await this.timetravelTo(sessionDetails.loadingRange[1]);
  }

  private async onTimetravelTabsClosed(): Promise<void> {
    await this.closeTimetravel();
    this.publish();
    // TODO: show a blank explainer page
  }

  private async closeTimetravel(): Promise<void> {
    if (!this.timetravelPlayer) return;

    this.timetravelPlayer.off('all-tabs-closed', this.onTimetravelTabsClosed);
    this.activeTimelineHeroSessionId = null;
    this.isHeroSessionFocused = false;
    const closePromise = this.timetravelPlayer.close();
    this.timetravelPlayer = null;
    await closePromise;
  }

  private trackHeroSession(heroSession: HeroSession, timelineRecorder?: TimelineRecorder): void {
    timelineRecorder ??= new TimelineRecorder(heroSession);
    timelineRecorder.on('updated', this.publish);
    this.timelineRecordersBySessionId.set(heroSession.id, timelineRecorder);
    this.openHeroSessionsById.set(heroSession.id, heroSession);

    heroSession.on('tab-created', this.onTab);
    heroSession.on('closing', this.untrackHeroSession.bind(this, heroSession));
  }

  private untrackHeroSession(heroSession: HeroSession): void {
    this.openHeroSessionsById.delete(heroSession.id);
    heroSession.off('tab-created', this.onTab);
    this.timelineRecordersBySessionId.get(heroSession.id)?.stop();
    this.timelineRecordersBySessionId.delete(heroSession.id);
  }

  private onTab(event: { tab: Tab }) {
    const { tab } = event;
    tab.on('wait-for-pagestate', this.onWaitForPageState.bind(this, tab));
  }

  private onWaitForPageState(tab: Tab, event: ITabEventParams['wait-for-pagestate']) {
    const listener = event.listener;
    const pageStateId = listener.id;
    const sessionId = tab.sessionId;
    if (!this.pageStateById.has(pageStateId)) {
      this.recordPageState(sessionId, listener);
    } else if (this.activePageStateId === pageStateId) {
      this.bindPageStateListenerToGenerator(listener);
    }

    const { generator } = this.pageStateById.get(pageStateId);
    const heroSession = tab.session;

    const sessionTimeline = this.trackPageStateTimeline(heroSession.db, pageStateId);
    const timelineRecorder = this.timelineRecordersBySessionId.get(sessionId);
    sessionTimeline.trackSession(heroSession, timelineRecorder);

    listener.on('resolved', this.onPageStateResolved.bind(this, tab, pageStateId));

    const { loadingRange, timelineRange } = sessionTimeline.onNewPageState(tab, listener);

    generator.addSession(heroSession.db, tab.id, loadingRange, timelineRange);
    this.onTimelineChange(sessionId, { timelineRange, pageStateId });

    this.updateState(generator);
  }

  private trackPageStateTimeline(
    db: SessionDb,
    pageStateId: string,
    timelineRange?: TimelineBuilder['timelineRange'],
  ): PageStateSessionTimeline {
    const pageStateTimeline = new PageStateSessionTimeline(
      db,
      pageStateId,
      this.pageStateById.get(pageStateId).generator,
      timelineRange,
    );
    pageStateTimeline.on('updated-generator', this.updateStateForGenerator);
    pageStateTimeline.on('timeline-change', this.onTimelineChange.bind(this, db.sessionId));

    this.pageStateById
      .get(pageStateId)
      .heroSessionTimelinesById.set(db.sessionId, pageStateTimeline);
    return pageStateTimeline;
  }

  private onPageStateResolved(tab: Tab, pageStateId: string, event: IPageStateEvents['resolved']) {
    const generator = this.pageStateById.get(pageStateId)?.generator;
    if (!generator) return;

    generator.sessionsById.get(tab.sessionId).needsProcessing = true;

    if (event.state) {
      generator.addState(event.state, tab.sessionId);
    } else {
      this.emit('unresolved', {
        heroSessionId: tab.sessionId,
        pageStateId,
        error: event.error,
      });
    }
    this.updateState(generator);
  }

  private onTimelineChange(
    heroSessionId: string,
    event: { timelineRange: [number, number]; pageStateId: string },
  ): void {
    if (
      this.timetravelPlayer?.sessionId === heroSessionId &&
      this.activePageStateId === event.pageStateId
    ) {
      this.timetravelPlayer.refreshTicks(event.timelineRange).catch(console.error);
    }
  }

  private publish(): void {
    const now = Date.now();
    const lastPublish = this.lastPublish ?? now - 201;
    const millisSincePublish = now - lastPublish;
    if (millisSincePublish < 200) {
      this.publishTimeout = setTimeout(this.publish, 200 - millisSincePublish);
      return;
    }
    clearTimeout(this.publishTimeout);
    this.lastPublish = now;
    this.emit('updated', this.toEvent());
  }

  private updateStateForGenerator(event: { pageStateId: string }): void {
    const pageState = this.pageStateById.get(event.pageStateId);
    this.updateState(pageState.generator);
  }

  private updateState(generator?: PageStateGenerator): void {
    generator ??= this.generator;
    if (!generator) return;
    generator
      .evaluate()
      .then(() => this.publish())
      .catch(error => this.logger.error('Error updating page state', { error }));
  }

  private recordPageState(heroSessionId: string, listener: PageStateListener): void {
    const pageStateId = listener.id;
    const generator = new PageStateGenerator(pageStateId, heroSessionId);

    this.pageStateById.set(pageStateId, {
      startingStates: [...listener.states],
      needsCodeChange: false,
      modifiedStates: new Set(),
      generator,
      heroSessionTimelinesById: new Map(),
    });

    for (const [id, rawAssertionsData] of listener.rawBatchAssertionsById) {
      if (id.startsWith('@')) {
        const state = listener.stateThatImportedBatchAssertion(id);
        generator.import(state, rawAssertionsData as IPageStateGeneratorAssertionBatch);
        for (const [sessionId, session] of generator.sessionsById) {
          this.manuallyAssignedHeroSessionIds.add(sessionId);
          if (session.db) {
            this.trackPageStateTimeline(session.db, pageStateId, session.timelineRange);
          }
        }
      }
    }

    if (!listener.states.length) {
      generator.addState('default', heroSessionId);
      this.didMakeStateChanges(pageStateId, 'default');
    }
  }

  private bindPageStateListenerToGenerator(listener: PageStateListener): void {
    const pageStateId = listener.id;
    const generator = this.pageStateById.get(pageStateId).generator;

    this.logger.info('Injecting PageState from ChromeAlive Generator', {
      pageStateId,
    });

    const stateByBatchId = new Map<string, string>();
    const pageState = this.pageStateById.get(pageStateId);
    // load up the current assertions
    for (const [state, details] of generator.statesByName) {
      if (details.sessionIds.size === 0) continue;
      const isGeneratorAddedState = !pageState.startingStates.includes(state);
      const isModifiedState = pageState.modifiedStates.has(state);
      if (!isGeneratorAddedState && !isModifiedState) continue;

      const id = listener.addAssertionBatch(state, generator.export(state));
      if (isGeneratorAddedState) stateByBatchId.set(id, state);
    }

    if (stateByBatchId.size) {
      listener.on('state', x => {
        for (const [id, state] of stateByBatchId) {
          if (x[id] === true) {
            this.logger.info('Resolving PageState with Generator-added state', {
              state,
              id,
            });
            listener.emit('state', { resolvedState: state });
            break;
          }
        }
      });
    }
  }

  private async closeDevtoolsPanel(sessionId: string) {
    await this.timetravelPlayer.activeTab.mirrorPage.isReady;
    DevtoolsPanelModule.bySessionId
      .get(sessionId)
      .closeDevtoolsPanelForPage(this.timetravelPlayer.activeTab.mirrorPage.page)
      .catch(console.error);
    await this.timetravelPlayer.activeTab.mirrorPage.page.bringToFront();
  }

  private getUnresolvedHeroSessionIds(pageStateId?: string): string[] {
    const generator = this.pageStateById.get(pageStateId ?? this.activePageStateId).generator;
    const unassignedSessionIds = new Set([
      ...this.openHeroSessionsById.keys(),
      ...generator.sessionsById.keys(),
    ]);
    for (const details of generator.statesByName.values()) {
      for (const sessionId of details.sessionIds) unassignedSessionIds.delete(sessionId);
    }
    return [...unassignedSessionIds];
  }

  private clear(): void {
    for (const details of this.pageStateById.values()) {
      for (const sessionTimeline of details.heroSessionTimelinesById.values()) {
        sessionTimeline.close();
      }
    }
    this.pageStateById.clear();
    this.openHeroSessionsById.clear();
    for (const [sessionId, timeline] of this.timelineRecordersBySessionId) {
      if (sessionId === this.sessionObserver.heroSession?.id) continue;
      timeline.stop();
    }
    this.timelineRecordersBySessionId.clear();
  }

  private toEvent(): IPageStateUpdateEvent {
    if (!this.activePageStateId || !this.pageStateById.has(this.activePageStateId)) return null;
    const { needsCodeChange } = this.pageStateById.get(this.activePageStateId);

    const result: IPageStateUpdateEvent = {
      id: this.activePageStateId,
      liveHeroSessionId: this.sessionObserver.heroSession?.id,
      needsCodeChange,
      focusedHeroSessionId: this.isHeroSessionFocused ? this.activeTimelineHeroSessionId : null,
      states: [],
      unresolvedHeroSessionIds: this.getUnresolvedHeroSessionIds(),
      heroSessions: [],
    };

    const generator = this.generator;
    if (!generator) return result;

    for (const [state, details] of generator.statesByName) {
      const assertionCounts = PageStateAssertions.countAssertions(details.assertsByFrameId);
      result.states.push({
        state,
        heroSessionIds: [...details.sessionIds],
        assertionCounts,
      });
    }

    for (const [id, generatorSession] of generator.sessionsById) {
      if (!generatorSession.db) continue;
      const sessionTimeline = this.getHeroSessionTimeline(id);
      const data = sessionTimeline.refreshMetadata();
      const assertionCounts = generator.sessionAssertions.sessionAssertionsCount(id);

      const timelineOffsetPercents = sessionTimeline.getTimelineOffsets(
        generatorSession.loadingRange,
      );
      result.heroSessions.push({
        id,
        timelineRange: generatorSession.timelineRange,
        loadingRange: generatorSession.loadingRange,
        timelineOffsetPercents,
        assertionCounts,
        timeline: data,
        isLive: this.isSessionLive(sessionTimeline.heroSession),
      });
    }

    for (const id of result.unresolvedHeroSessionIds) {
      // if created, but not in generator yet, add now
      if (!generator.sessionsById.has(id)) {
        const heroSession = this.openHeroSessionsById.get(id);
        const db = heroSession?.db;
        if (!db) continue;

        const navigations = db.frameNavigations.getAllNavigations();
        let startTime = heroSession.createdTime;
        for (const nav of navigations) {
          const domContentLoaded = nav.statusChanges.get(LoadStatus.DomContentLoaded);
          if (domContentLoaded) {
            startTime = domContentLoaded;
            break;
          }
        }
        const timelineRange: [number, number] = [startTime, Date.now()];
        const timeline = CommandTimeline.fromDb(db, timelineRange);
        const data = TimelineBuilder.createTimelineMetadata(timeline, db);
        result.heroSessions.push({
          id,
          timelineRange,
          loadingRange: [...timelineRange],
          timelineOffsetPercents: [0, 100],
          assertionCounts: { total: 0 },
          timeline: data,
          isLive: this.isSessionLive(heroSession),
        });
      }
    }
    for (let i = 0; i < this.placeholderSessions; i += 1) {
      result.unresolvedHeroSessionIds.push('placeholder');
      result.heroSessions.push({
        id: 'placeholder',
        timelineRange: [0, 0],
        loadingRange: [0, 0],
        timelineOffsetPercents: [0, 100],
        assertionCounts: { total: 0 },
        timeline: { urls: [], paintEvents: [], screenshots: [], storageEvents: [] },
        isLive: true,
      });
    }
    return result;
  }

  private isSessionLive(heroSession: HeroSession): boolean {
    if (this.sessionObserver.heroSession === heroSession)
      return this.sessionObserver.playbackState === 'live';
    return heroSession.isClosing === false;
  }

  private didMakeStateChanges(pageStateId: string, state: string): void {
    const meta = this.pageStateById.get(pageStateId);
    const newStateList = meta.generator.states.toString();
    meta.needsCodeChange = newStateList !== meta.startingStates.toString();
    if (meta.startingStates.includes(state)) meta.modifiedStates.add(state);
  }
}
