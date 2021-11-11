import PageStateGenerator, {
  IPageStateGeneratorAssertionBatch,
  IPageStateSession,
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
import TimelineBuilder from '@ulixee/hero-timetravel/player/TimelineBuilder';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import PageStateCodeBlock from '@ulixee/hero-timetravel/lib/PageStateCodeBlock';
import PageStateAssertions from '@ulixee/hero-timetravel/lib/PageStateAssertions';
import DevtoolsPanelModule from './hero-plugin-modules/DevtoolsPanelModule';

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

  public get activeTimelineBuilder(): TimelineBuilder {
    return this.timelineBuildersByHeroSessionId.get(this.activeTimelineHeroSessionId);
  }

  public defaultWaitMilliseconds = 5e3;

  private readonly pageStateById = new Map<
    string,
    {
      startingStates: string[];
      needsCodeChange: boolean;
      modifiedStates: Set<string>;
      generator: PageStateGenerator;
    }
  >();

  private readonly heroSessionsById = new Map<string, HeroSession>();
  private readonly autoAssignedHeroSessionIds = new Set<string>();
  private readonly timelineBuildersByHeroSessionId = new Map<string, TimelineBuilder>();

  private activePageStateId: string;
  private isHeroSessionFocused = false;
  private activeTimelineHeroSessionId: string;
  private tabGroupId: number;

  private placeholderSessions = 0;

  private timetravelPlayer: TimetravelPlayer;

  private readonly scriptEntrypoint: string;

  constructor(readonly sessionObserver: SessionObserver, timeline: TimelineBuilder) {
    super();

    bindFunctions(this);
    const sourceHeroSession = sessionObserver.heroSession;
    this.scriptEntrypoint = sourceHeroSession.options.scriptInstanceMeta.entrypoint;
    this.logger = log.createChild(module, {
      sessionId: sourceHeroSession.id,
    });
    this.trackHeroSession(sourceHeroSession, timeline);
  }

  public async save(): Promise<{ code: string; needsCodeChange: boolean }> {
    const id = this.activePageStateId;

    const { needsCodeChange, generator } = this.pageStateById.get(id);
    const code = await PageStateCodeBlock.generateCodeBlock(generator);
    return { needsCodeChange, code };
  }

  public async close(destroy = false): Promise<void> {
    this.emit(destroy ? 'close' : 'exit');
    for (const { generator } of this.pageStateById.values()) {
      await generator.close();
    }
    // don't clear generators or sessions in case we re-open
    if (destroy) {
      this.pageStateById.clear();
      this.heroSessionsById.clear();
    }

    this.sessionObserver.tabGroupModule.off('tab-group-opened', this.listenForTabGroupOpened);
    await this.closeTimetravel();

    await this.sessionObserver.updateTabGroup(false);
  }

  public addMultiverse(): void {
    const execArgv = ['--mode', 'multiverse'];

    if (this.scriptEntrypoint.endsWith('.ts')) {
      execArgv.push('-r', 'ts-node/register');
    }

    try {
      this.placeholderSessions += 1;
      fork(this.scriptEntrypoint, execArgv, {
        stdio: 'inherit',
        env: { ...process.env, HERO_CLI_NOPROMPT: 'true' },
      });
      if (this.activePageStateId) this.publish();
    } catch (error) {
      this.logger.error('ERROR running multiverse', { error });
    }
  }

  public onMultiverseSession(heroSession: HeroSession) {
    // might not be our session
    if (heroSession.options.scriptInstanceMeta.entrypoint !== this.scriptEntrypoint) {
      return;
    }
    heroSession.configureHeaded({ showBrowser: false });
    heroSession.options.sessionKeepAlive = false;
    heroSession.options.sessionResume = null;
    this.trackHeroSession(heroSession);
    this.placeholderSessions -= 1;
    if (this.activePageStateId) this.publish();
  }

  public async loadPageState(id: string): Promise<void> {
    this.emit('enter', { pageStateId: id });
    this.activePageStateId = id;
    const unresolvedHeroSessionIds = this.getUnresolvedHeroSessionIds();
    const sessionIdToOpen =
      unresolvedHeroSessionIds[0] ??
      this.autoAssignedHeroSessionIds.values().next()?.value ??
      this.heroSessionsById.keys().next().value;
    await this.openTimetravel(sessionIdToOpen);
    await DevtoolsPanelModule.bySessionId
      .get(sessionIdToOpen)
      .closeDevtoolsPanelForPage(this.timetravelPlayer.activeTab.mirrorPage.page);
    await this.timetravelPlayer.activeTab.mirrorPage.page.bringToFront();
    this.publish();
  }

  public async focusSessionTimeBoundary(isStartTime: boolean): Promise<void> {
    const timelineBuilder = this.activeTimelineBuilder;
    const focusedSessionId = this.activeTimelineHeroSessionId;
    const session = this.generator.sessionsById.get(focusedSessionId);
    const percentOffset = timelineBuilder.commandTimeline.getTimelineOffsetForTimestamp(
      isStartTime ? session.loadingRange[0] : session.loadingRange[1],
    );
    await this.timetravelPlayer.goto(percentOffset, timelineBuilder.lastMetadata);
  }

  public async changeSessionTimeBoundary(
    percentOffset: number,
    isStartTime: boolean,
  ): Promise<void> {
    this.autoAssignedHeroSessionIds.delete(this.activeTimelineHeroSessionId);
    const timelineBuilder = this.activeTimelineBuilder;
    const timestamp = timelineBuilder.commandTimeline.getTimestampForOffset(percentOffset);
    await this.timetravelPlayer.goto(percentOffset, timelineBuilder.lastMetadata);
    const focusedSessionId = this.activeTimelineHeroSessionId;
    const session = this.generator.sessionsById.get(focusedSessionId);

    const index = isStartTime ? 0 : 1;
    session.loadingRange[index] = timestamp;
    session.needsResultsVerification = true;
    const modifiedState = this.generator.getStateForSessionId(focusedSessionId);
    if (modifiedState) {
      this.didMakeStateChanges(this.activePageStateId, modifiedState);
    }
    this.updateState();
  }

  public addState(name: string, ...heroSessionIds: string[]): void {
    for (const id of heroSessionIds) this.autoAssignedHeroSessionIds.delete(id);
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
  }

  public removeState(name: string): void {
    const existing = this.generator.statesByName.get(name);
    if (!existing) return;
    this.generator.statesByName.delete(name);
    this.didMakeStateChanges(this.activePageStateId, name);
    this.updateState();
  }

  public isShowingSession(heroSessionId: string): boolean {
    return this.activeTimelineBuilder?.sessionId === heroSessionId;
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

    this.sessionObserver.tabGroupModule.off('tab-group-opened', this.close as any);

    if (this.timetravelPlayer) await this.closeTimetravel();

    this.activeTimelineHeroSessionId = heroSessionId;
    this.isHeroSessionFocused = true;
    this.timetravelPlayer = TimetravelPlayer.create(
      heroSessionId,
      // load into context of source hero
      this.sessionObserver.heroSession,
      this.generator.sessionsById.get(heroSessionId).timelineRange,
    );
    this.tabGroupId = await this.sessionObserver.groupTabs('', 'grey', true);
    this.sessionObserver.tabGroupModule.on('tab-group-opened', this.listenForTabGroupOpened);
    this.activeTimelineBuilder.refreshMetadata();

    await this.gotoActiveSessionEnd();
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

  private async gotoActiveSessionEnd(): Promise<void> {
    const sessionDetails = this.generator.sessionsById.get(this.activeTimelineHeroSessionId);
    const offsets = this.getTimelineOffsets(sessionDetails);
    await this.timetravelPlayer.goto(offsets[1], this.activeTimelineBuilder.lastMetadata);
  }

  private async onTimetravelTabsClosed(): Promise<void> {
    await this.closeTimetravel();
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

  private getTimelineOffsets(pageStateSession: IPageStateSession): [number, number] {
    const timelineBuilder = this.timelineBuildersByHeroSessionId.get(
      pageStateSession.sessionId,
    ).commandTimeline;
    const [loadStart, loadEnd] = pageStateSession.loadingRange;
    const offsetLeft = timelineBuilder.getTimelineOffsetForTimestamp(loadStart);
    const offsetRight = timelineBuilder.getTimelineOffsetForTimestamp(loadEnd);
    return [offsetLeft, offsetRight];
  }

  private trackHeroSession(heroSession: HeroSession, timeline?: TimelineBuilder): void {
    const id = heroSession.id;
    this.heroSessionsById.set(id, heroSession);
    heroSession.on('tab-created', this.onTab);

    if (heroSession.mode === 'multiverse') {
      heroSession.db.keepAlive = true;
    }

    timeline ??= new TimelineBuilder(heroSession.db, heroSession);
    timeline.on('updated', this.onTimelineUpdated.bind(this, timeline, heroSession.id));
    this.timelineBuildersByHeroSessionId.set(id, timeline);
    this.onTimelineUpdated(timeline, heroSession.id);
  }

  private onTimelineUpdated(timelineBuilder: TimelineBuilder, sessionId: string) {
    timelineBuilder.refreshMetadata();
    const generatorSession = this.generator?.sessionsById?.get(sessionId);
    if (generatorSession && this.autoAssignedHeroSessionIds.has(sessionId)) {
      let hasChanges = false;
      for (const url of timelineBuilder.lastMetadata?.urls ?? []) {
        for (const loadEvent of url.loadStatusOffsets) {
          if (loadEvent.offsetPercent === -1) continue;
          if (loadEvent.loadStatus === LoadStatus.HttpResponded) {
            if (loadEvent.timestamp > generatorSession.loadingRange[0]) {
              generatorSession.loadingRange[0] = loadEvent.timestamp;
              hasChanges = true;
            }
          }
          if (loadEvent.loadStatus === LoadStatus.DomContentLoaded) {
            if (
              // before complete
              loadEvent.timestamp < generatorSession.timelineRange[1] &&
              // after load event
              loadEvent.timestamp > generatorSession.loadingRange[0]
            ) {
              generatorSession.loadingRange[1] = loadEvent.timestamp;
              hasChanges = true;
            }
          }
        }
      }
      if (hasChanges) this.updateState();
    }
    this.publish();
  }

  private publish(): void {
    this.emit('updated', this.toEvent());
  }

  private updateState(generator?: PageStateGenerator): void {
    generator ??= this.generator;
    if (!generator) return;
    generator
      .evaluate()
      .then(() => this.publish())
      .catch(error => this.logger.error('Error updating page state', { error }));
  }

  private onTab(event: { tab: Tab }) {
    const { tab } = event;
    tab.on('wait-for-pagestate', this.onWaitForPageState.bind(this, tab));
  }

  private onWaitForPageState(tab: Tab, event: ITabEventParams['wait-for-pagestate']) {
    const listener = event.listener;
    const pageStateId = listener.id;
    if (!this.pageStateById.has(pageStateId)) {
      this.recordPageState(tab, listener);
    } else if (this.activePageStateId === pageStateId) {
      this.bindPageStateListenerToGenerator(listener);
    }

    const generator = this.pageStateById.get(pageStateId).generator;

    if (listener.states.length) {
      listener.on('resolved', this.onPageStateResolved.bind(this, tab, pageStateId));
    }

    const startTime = listener.startTime;
    const endTime = startTime + this.defaultWaitMilliseconds;
    const timeRange: [number, number] = [startTime, endTime];

    generator.addSession(tab.session.db, tab.id, timeRange, timeRange);
    this.autoAssignedHeroSessionIds.add(tab.sessionId);

    const timelineBuilder = this.timelineBuildersByHeroSessionId.get(tab.sessionId);
    timelineBuilder?.setTimeRange(...timeRange);
    if (timelineBuilder && endTime > Date.now()) {
      timelineBuilder.recordScreenUntilTime = endTime;
    }
    if (this.timetravelPlayer && this.activeTimelineHeroSessionId === tab.sessionId) {
      this.timetravelPlayer.refreshTicks(timeRange).catch(error => {
        this.logger.error('Error refreshing Timetravel ticks', { error });
      });
    }
    this.updateState(generator);
  }

  private onPageStateResolved(tab: Tab, pageStateId: string, event: IPageStateEvents['resolved']) {
    const generator = this.pageStateById.get(pageStateId).generator;
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

  private recordPageState(tab: Tab, listener: PageStateListener): void {
    const pageStateId = listener.id;
    const generator = new PageStateGenerator(pageStateId);
    generator.createBrowserContext(tab.sessionId);
    for (const [id, rawAssertionsData] of listener.rawBatchAssertionsById) {
      if (id.startsWith('@')) {
        generator.import(rawAssertionsData as IPageStateGeneratorAssertionBatch);
      }
    }

    this.pageStateById.set(pageStateId, {
      startingStates: [...listener.states],
      needsCodeChange: false,
      modifiedStates: new Set(),
      generator,
    });

    if (!listener.states.length) {
      generator.addState('default', tab.sessionId);
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

  private getUnresolvedHeroSessionIds(pageStateId?: string): string[] {
    const generator = this.pageStateById.get(pageStateId ?? this.activePageStateId).generator;
    const unassignedSessionIds = new Set(this.heroSessionsById.keys());
    for (const details of generator.statesByName.values()) {
      for (const sessionId of details.sessionIds) unassignedSessionIds.delete(sessionId);
    }
    return [...unassignedSessionIds];
  }

  private toEvent(): IPageStateUpdateEvent {
    if (!this.activePageStateId) return;
    const { needsCodeChange } = this.pageStateById.get(this.activePageStateId);

    const result: IPageStateUpdateEvent = {
      id: this.activePageStateId,
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
      const timeline = CommandTimeline.fromDb(generatorSession.db, generatorSession.timelineRange);
      const data = TimelineBuilder.createTimelineMetadata(timeline, generatorSession.db);
      const assertionCounts = generator.sessionAssertions.sessionAssertionsCount(id);

      const timelineOffsetPercents = this.getTimelineOffsets(generatorSession);
      result.heroSessions.push({
        id,
        timelineRange: generatorSession.timelineRange,
        loadingRange: generatorSession.loadingRange,
        timelineOffsetPercents,
        assertionCounts,
        timeline: data,
      });
    }

    for (const id of result.unresolvedHeroSessionIds) {
      // if created, but not in generator yet, add now
      if (!generator.sessionsById.has(id)) {
        const db = this.heroSessionsById.get(id)?.db;
        if (!db) continue;

        const navigations = db.frameNavigations.getAllNavigations();
        let startTime = db.commands.all()[0]?.runStartDate ?? Date.now();
        if (navigations.length)
          startTime = navigations
            .map(x => x.statusChanges.get(LoadStatus.DomContentLoaded))
            .find(x => x);
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
        timeline: { urls: [], paintEvents: [], screenshots: [] },
      });
    }
    return result;
  }

  private didMakeStateChanges(pageStateId: string, state: string): void {
    const meta = this.pageStateById.get(pageStateId);
    const newStateList = meta.generator.states.toString();
    meta.needsCodeChange = newStateList !== meta.startingStates.toString();
    if (meta.startingStates.includes(state)) meta.modifiedStates.add(state);
  }
}
