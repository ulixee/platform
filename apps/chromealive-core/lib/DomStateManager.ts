import DomStateGenerator, {
  IDomStateGeneratorAssertionBatch,
} from '@ulixee/hero-timetravel/lib/DomStateGenerator';
import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { fork } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import { ITabEventParams } from '@ulixee/hero-core/lib/Tab';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import DomStateListener, { IDomStateEvents } from '@ulixee/hero-core/lib/DomStateListener';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import SessionObserver from './SessionObserver';
import CommandTimeline from '@ulixee/hero-timetravel/lib/CommandTimeline';
import IDomStateUpdateEvent from '@ulixee/apps-chromealive-interfaces/events/IDomStateUpdatedEvent';
import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import DomStateAssertions from '@ulixee/hero-timetravel/lib/DomStateAssertions';
import DevtoolsPanelModule from './hero-plugin-modules/DevtoolsPanelModule';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import DomStateSessionTimeline from './DomStateSessionTimeline';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';
import AboutPage from './AboutPage';
import SourceLoader from '@ulixee/commons/lib/SourceLoader';

const { log } = Log(module);

export default class DomStateManager extends TypedEventEmitter<{
  updated: IDomStateUpdateEvent;
  unresolved: { domStateId: string; heroSessionId: string; error?: Error };
  close: void;
  imported: { heroSessionIds: string[] };
  enter: { domStateId: string };
  exit: void;
}> {
  public get generator(): DomStateGenerator {
    return this.domStateById.get(this.activeDomStateId)?.generator;
  }

  public get activeSessionTimeline(): DomStateSessionTimeline {
    return this.getHeroSessionTimeline(this.activeTimelineHeroSessionId);
  }

  private readonly domStateById = new Map<
    string,
    {
      name: string;
      generator: DomStateGenerator;
      manuallyAssignedHeroSessionIds: Set<string>;
      heroSessionTimelinesById: Map<string, DomStateSessionTimeline>;
    }
  >();

  private activeDomStateId: string;
  private activeTimelineHeroSessionId: string;
  private readonly aboutPage: AboutPage;
  private tabGroupId: number;
  private readonly spawnedWorldHeroSessionIds = new Set<string>();
  private readonly openHeroSessionsById = new Map<string, HeroSession>();
  private timelineRecordersBySessionId = new Map<string, TimelineRecorder>();

  private placeholderSessions = 0;

  private timetravelPlayer: TimetravelPlayer;

  private readonly scriptInstanceMeta: IScriptInstanceMeta;

  private isClosing = false;
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
    this.aboutPage = new AboutPage(sessionObserver.heroSession);
    this.trackHeroSession(sourceHeroSession, sessionObserver.timelineRecorder);
  }

  public getDomState(domStateId: string): ReturnType<DomStateManager['domStateById']['get']> {
    return this.domStateById.get(domStateId);
  }

  public getScreenshot(heroSessionId: string, tabId: number, timestamp: number): string {
    const timeline = this.getHeroSessionTimeline(heroSessionId);
    if (timeline) return timeline.timelineBuilder.getScreenshot(tabId, timestamp);
    const heroSession = this.openHeroSessionsById.get(heroSessionId);
    if (heroSession) {
      return heroSession.db.screenshots.getImage(tabId, timestamp)?.toString('base64');
    }
  }

  public getHeroSessionTimeline(heroSessionId: string): DomStateSessionTimeline {
    return this.domStateById
      .get(this.activeDomStateId)
      ?.heroSessionTimelinesById?.get(heroSessionId);
  }

  public async close(destroy = false): Promise<void> {
    this.isClosing = true;
    this.emit(destroy ? 'close' : 'exit');
    for (const { generator } of this.domStateById.values()) {
      await generator.close();
    }
    if (this.aboutPage) await this.aboutPage.close();
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
      if (this.activeDomStateId) this.publish();
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
    if (this.activeDomStateId) this.publish();
  }

  public async loadDomState(id: string): Promise<void> {
    this.isClosing = false;
    this.emit('enter', { domStateId: id });
    this.activeDomStateId = id;

    const sessionIdToOpen = this.sessionObserver.heroSession.id;
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
    this.domStateById
      .get(this.activeDomStateId)
      .manuallyAssignedHeroSessionIds.add(this.activeTimelineHeroSessionId);
    const timestamp = this.activeSessionTimeline.changeLoadingRangeBoundary(
      percentOffset,
      isStartTime,
    );
    await this.timetravelTo(timestamp);

    this.updateState();
  }

  public extendSessionTime(sessionId: string, millis: number): Promise<void> {
    this.domStateById
      .get(this.activeDomStateId)
      .manuallyAssignedHeroSessionIds.add(this.activeTimelineHeroSessionId);

    const sessionTimeline = this.getHeroSessionTimeline(sessionId);
    sessionTimeline.extendTimelineRange(millis);
    // will update time in event from sessionTimeline

    return Promise.resolve();
  }

  public isShowingSession(heroSessionId: string): boolean {
    return this.activeSessionTimeline?.sessionId === heroSessionId;
  }

  public async unfocusSession(): Promise<void> {
    this.activeTimelineHeroSessionId = null;
    await this.aboutPage.open('circuits');
    await this.closeTimetravel();
    this.publish();
  }

  public async openTimetravel(heroSessionId: string): Promise<void> {
    if (this.activeTimelineHeroSessionId === heroSessionId) {
      await this.gotoActiveSessionEnd();
      return;
    }

    // can't open yet
    if (!this.generator.sessionsById.has(heroSessionId)) return;

    const prevTimetravel = this.timetravelPlayer;
    if (prevTimetravel) {
      prevTimetravel.off('all-tabs-closed', this.onTimetravelTabsClosed);
    }

    this.activeTimelineHeroSessionId = heroSessionId;
    this.timetravelPlayer = TimetravelPlayer.create(
      heroSessionId,
      // load into context of source hero
      this.sessionObserver.heroSession,
      this.generator.sessionsById.get(heroSessionId).timelineRange,
    );
    this.activeSessionTimeline.refreshMetadata();

    await Promise.all([
      this.gotoActiveSessionEnd(),
      prevTimetravel?.close(),
      this.aboutPage.close(),
    ]);
    this.timetravelPlayer.once('all-tabs-closed', this.onTimetravelTabsClosed);
  }

  private listenForTabGroupOpened(openedGroupId: number) {
    const groupId = this.tabGroupId;
    // if still open, re-collapse
    if (groupId === openedGroupId && this.domStateById.size) {
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
    if (!this.isClosing) {
      await this.aboutPage.open('circuits');
    }

    this.publish();
  }

  private async closeTimetravel(): Promise<void> {
    if (!this.timetravelPlayer) return;

    this.timetravelPlayer.off('all-tabs-closed', this.onTimetravelTabsClosed);
    this.activeTimelineHeroSessionId = null;
    const closePromise = this.timetravelPlayer.close();
    this.timetravelPlayer = null;
    await closePromise;
  }

  private trackHeroSession(heroSession: HeroSession, timelineRecorder?: TimelineRecorder): void {
    timelineRecorder ??= new TimelineRecorder(heroSession);
    timelineRecorder.on('updated', this.publish);
    this.timelineRecordersBySessionId.set(heroSession.id, timelineRecorder);
    this.openHeroSessionsById.set(heroSession.id, heroSession);
    this.spawnedWorldHeroSessionIds.add(heroSession.id);

    // DISABLE tracking tabs, which live updates background sessions
    // heroSession.on('tab-created', this.onTab);
    heroSession.on('closing', this.untrackHeroSession.bind(this, heroSession));
  }

  private untrackHeroSession(heroSession: HeroSession): void {
    this.openHeroSessionsById.delete(heroSession.id);
    heroSession.off('tab-created', this.onTab);
    this.timelineRecordersBySessionId.get(heroSession.id)?.close();
    this.timelineRecordersBySessionId.delete(heroSession.id);
  }

  private onTab(event: { tab: Tab }) {
    const { tab } = event;
    tab.on('wait-for-domstate', this.onWaitForDomState.bind(this, tab));
  }

  private onWaitForDomState(tab: Tab, event: ITabEventParams['wait-for-domstate']) {
    const listener = event.listener;
    const domStateId = listener.id;
    const sessionId = tab.sessionId;

    let didAddToDefaultState = false;
    if (!this.domStateById.has(domStateId)) {
      didAddToDefaultState = this.recordDomState(tab, listener);
    }

    const { generator } = this.domStateById.get(domStateId);
    const heroSession = tab.session;

    const sessionTimeline = this.trackDomStateTimeline(heroSession.db, domStateId);
    const timelineRecorder = this.timelineRecordersBySessionId.get(sessionId);
    sessionTimeline.trackSession(heroSession, timelineRecorder);

    // If we already have this session, don't wait for a result. It got added to default
    if (!didAddToDefaultState) {
      listener.on('resolved', this.onDomStateResolved.bind(this, tab, domStateId));
    }

    const { loadingRange, timelineRange } = sessionTimeline.onNewDomState(tab, listener);

    generator.addSession(heroSession.db, tab.id, loadingRange, timelineRange);
    this.onTimelineChange(sessionId, { timelineRange, domStateId });

    this.updateState(generator);
  }

  private trackDomStateTimeline(
    db: SessionDb,
    domStateId: string,
    timelineRange?: TimelineBuilder['timelineRange'],
  ): DomStateSessionTimeline {
    const domStateTimeline = new DomStateSessionTimeline(
      db,
      domStateId,
      this.domStateById.get(domStateId).generator,
      timelineRange,
    );
    domStateTimeline.on('updated-generator', this.updateStateForGenerator);
    domStateTimeline.on('timeline-change', this.onTimelineChange.bind(this, db.sessionId));

    this.domStateById.get(domStateId).heroSessionTimelinesById.set(db.sessionId, domStateTimeline);
    return domStateTimeline;
  }

  private onDomStateResolved(tab: Tab, domStateId: string, event: IDomStateEvents['resolved']) {
    const activeDomState = this.domStateById.get(domStateId);
    const generator = activeDomState?.generator;
    if (!generator) return;

    generator.sessionsById.get(tab.sessionId).needsProcessing = true;

    if (!event.didMatch) {
      this.emit('unresolved', {
        heroSessionId: tab.sessionId,
        domStateId,
        error: event.error,
      });
    }
    this.updateState(generator);
  }

  private onTimelineChange(
    heroSessionId: string,
    event: { timelineRange: [number, number]; domStateId: string },
  ): void {
    if (
      this.timetravelPlayer?.sessionId === heroSessionId &&
      this.activeDomStateId === event.domStateId
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

  private updateStateForGenerator(event: { domStateId: string }): void {
    const domState = this.domStateById.get(event.domStateId);
    this.updateState(domState.generator);
  }

  private updateState(generator?: DomStateGenerator): void {
    generator ??= this.generator;
    if (!generator) return;
    generator
      .evaluate()
      .then(() => this.publish())
      .catch(error => this.logger.error('Error updating dom state', { error }));
  }

  private recordDomState(tab: Tab, listener: DomStateListener): boolean {
    const domStateId = listener.id;
    const generator = new DomStateGenerator(domStateId, tab.sessionId);

    const lastCommand = tab.session.commands.history[tab.session.commands.length - 2];
    let name = `after "${lastCommand.name}"`;
    if (lastCommand.callsite) {
      const callsite = lastCommand.callsite[0];
      const sourceCode = SourceLoader.getSource(callsite);
      if (sourceCode?.code) {
        name = `after "${sourceCode.code.trim()}"`;
      }
    }

    this.domStateById.set(domStateId, {
      name,
      generator,
      manuallyAssignedHeroSessionIds: new Set(),
      heroSessionTimelinesById: new Map(),
    });

    for (const [id, rawAssertionsData] of listener.rawBatchAssertionsById) {
      if (id.startsWith('@')) {
        generator.import(rawAssertionsData as IDomStateGeneratorAssertionBatch);
        for (const [sessionId, session] of generator.sessionsById) {
          this.domStateById.get(domStateId).manuallyAssignedHeroSessionIds.add(sessionId);
          if (session.db) {
            this.trackDomStateTimeline(session.db, domStateId, session.timelineRange);
          }
        }
        this.emit('imported', { heroSessionIds: [...generator.sessionsById.keys()] });
      }
    }

    return false;
  }

  private async closeDevtoolsPanel(sessionId: string) {
    await this.timetravelPlayer.activeTab.mirrorPage.isReady;
    DevtoolsPanelModule.bySessionId
      .get(sessionId)
      .closeDevtoolsPanelForPage(this.timetravelPlayer.activeTab.mirrorPage.page)
      .catch(console.error);
    await this.timetravelPlayer.activeTab.mirrorPage.page.bringToFront();
  }

  private clear(): void {
    for (const details of this.domStateById.values()) {
      for (const sessionTimeline of details.heroSessionTimelinesById.values()) {
        sessionTimeline.close();
      }
    }
    this.domStateById.clear();
    this.openHeroSessionsById.clear();
    for (const [sessionId, timeline] of this.timelineRecordersBySessionId) {
      if (sessionId === this.sessionObserver.heroSession?.id) continue;
      timeline.close();
    }
    this.timelineRecordersBySessionId.clear();
  }

  private toEvent(): IDomStateUpdateEvent {
    if (!this.activeDomStateId || !this.domStateById.has(this.activeDomStateId)) return null;
    const { name } = this.domStateById.get(this.activeDomStateId);

    const result: IDomStateUpdateEvent = {
      id: this.activeDomStateId,
      name,
      assertionCounts: { total: 0 },
      heroSessions: [],
    };

    const generator = this.generator;
    if (!generator) return result;

    result.assertionCounts = DomStateAssertions.countAssertions(generator.assertsByFrameId);

    const heroAliveId = this.sessionObserver.heroSession?.id;

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
        isPrimary: id === heroAliveId,
        isFocused: this.activeTimelineHeroSessionId === id,
        isSpawnedWorld: this.spawnedWorldHeroSessionIds.has(id) && id !== heroAliveId,
        isRunning: this.isSessionLive(sessionTimeline.heroSession),
      });
    }

    // find sessions that are "pre" hitting the dom state
    for (const [id, heroSession] of this.openHeroSessionsById) {
      // if created, but not in generator yet, add now
      if (generator.sessionsById.has(id)) continue;
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
        isPrimary: false,
        isFocused: false,
        isSpawnedWorld: this.openHeroSessionsById.has(id),
        isRunning: this.isSessionLive(heroSession),
      });
    }

    // sessions that have just kicked off won't have ids yet
    for (let i = 0; i < this.placeholderSessions; i += 1) {
      result.heroSessions.push({
        id: 'placeholder',
        timelineRange: [0, 0],
        loadingRange: [0, 0],
        timelineOffsetPercents: [0, 100],
        assertionCounts: { total: 0 },
        timeline: { urls: [], paintEvents: [], screenshots: [], storageEvents: [] },
        isPrimary: false,
        isFocused: false,
        isRunning: true,
        isSpawnedWorld: true,
      });
    }
    return result;
  }

  private isSessionLive(heroSession: HeroSession): boolean {
    if (!heroSession) return false;
    if (this.sessionObserver.heroSession === heroSession)
      return this.sessionObserver.playbackState === 'running';
    return heroSession.isClosing === false;
  }
}
