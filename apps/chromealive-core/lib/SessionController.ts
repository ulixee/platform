import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import IHeroSessionUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionUpdatedEvent';
import type { IOutputChangeRecord } from '@ulixee/hero-core/models/OutputTable';
import IDatastoreOutputEvent from '@ulixee/apps-chromealive-interfaces/events/IDatastoreOutputEvent';
import IDatastoreCollectedAssets from '@ulixee/apps-chromealive-interfaces/IDatastoreCollectedAssets';
import IDatastoreCollectedAssetEvent from '@ulixee/apps-chromealive-interfaces/events/IDatastoreCollectedAssetEvent';
import ISessionAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/ISessionAppModeEvent';
import { spawn } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import TimelineWatch from '@ulixee/hero-timetravel/lib/TimelineWatch';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import ISessionApi, {
  ISessionResumeArgs,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import SourceLoader from '@ulixee/commons/lib/SourceLoader';
import ISourceCodeLocation from '@ulixee/commons/interfaces/ISourceCodeLocation';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';
import MirrorPage from '@ulixee/hero-timetravel/lib/MirrorPage';
import CommandTimeline from '@ulixee/hero-timetravel/lib/CommandTimeline';
import { LoadStatus } from '@ulixee/unblocked-specification/agent/browser/Location';
import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { ISelectorMap } from '@ulixee/apps-chromealive-interfaces/ISelectorMap';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import { IChromeAliveSessionApis } from '@ulixee/apps-chromealive-interfaces/apis';
import { IncomingMessage } from 'http';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import DetachedAssets from '@ulixee/hero-core/lib/DetachedAssets';
import MirrorNetwork from '@ulixee/hero-timetravel/lib/MirrorNetwork';
import sessionTicksApi from '@ulixee/hero-core/apis/Session.ticks';
import ResourceSearch from './ResourceSearch';
import ElementsModule from './app-extension-modules/ElementsModule';
import DevtoolsBackdoorModule from './app-extension-modules/DevtoolsBackdoorModule';
import SourceCodeTimeline from './SourceCodeTimeline';
import OutputRebuilder from './OutputRebuilder';
import SelectorRecommendations from './SelectorRecommendations';
import AppReplayWindowController from './AppReplayWindowController';
import AppDevtoolsConnection from './AppDevtoolsConnection';

const { log } = Log(module);

type TConnectionToChromeAliveSessionClient = IConnectionToClient<
  IChromeAliveSessionApis,
  IChromeAliveEvents
>;

export default class SessionController extends TypedEventEmitter<{
  closed: void;
}> {
  public mode: ISessionAppModeEvent['mode'] = 'Live';
  public playbackState: IHeroSessionUpdatedEvent['playbackState'] = 'finished';
  public readonly timetravelPlayer: TimetravelPlayer;
  public readonly scriptInstanceMeta: IScriptInstanceMeta;
  public readonly sourceCodeTimeline: SourceCodeTimeline;

  public readonly mirrorPagesByTabId: { [tabId: number]: MirrorPage } = {};

  public readonly worldHeroSessionIds = new Set<string>();

  public get devtoolsBackdoorModule(): DevtoolsBackdoorModule {
    return this.replayAppWindow.devtoolsBackdoorModule;
  }

  public get elementsModule(): ElementsModule {
    return this.replayAppWindow.elementsModule;
  }

  public mirrorPagePauseRefreshing = false;
  public replayAppWindow: AppReplayWindowController;
  public replayTransport: ITransportToClient<any>;

  private selectorRecommendations: SelectorRecommendations;
  private timelineWatch: TimelineWatch;
  private outputRebuilder = new OutputRebuilder();

  private readonly lastDomChangesByTabId: Record<number, number> = {};
  private mirrorRefreshLastUpdated: number;
  private mirrorRefreshTimeout: NodeJS.Timeout;
  private lastTimelineMetadata: ITimelineMetadata;

  private resourceSearch: ResourceSearch;
  private isSearchingTimetravel = false;

  private restartingSessionId: string;
  private readonly scriptEntrypointTs: string;
  private scriptLastModifiedTime: number;
  private hasScriptUpdatesSinceLastRun = false;
  private watchHandle: Fs.FSWatcher;
  private readonly inputBytes: number = 0;
  private readonly sessionId: string;
  private liveSession: HeroSession;

  private connections: TConnectionToChromeAliveSessionClient[] = [];
  private readonly apiHandlers: IChromeAliveSessionApis;

  private readonly logger: IBoundLog;
  private events = new EventSubscriber();

  constructor(
    private readonly db: SessionDb,
    private readonly options: ISessionCreateOptions,
    devtoolsConnection: AppDevtoolsConnection,
  ) {
    super();
    bindFunctions(this);
    this.apiHandlers = {
      'Session.openMode': this.openMode,
      'Session.load': this.load,
      'Session.close': this.close,
      'Session.timetravel': this.timetravel,
      'Session.getTimetravelState': this.getTimetravelState,
      'Session.resume': this.resume,
      'Session.pause': this.pause,
      'Session.getScreenshot': this.getScreenshot,
      'Session.getScriptState': this.getScriptState,
      'Session.getDom': this.getDom,
      'Session.getMeta': this.getMeta,
      'Session.search': this.search,
      'Session.replayTargetCreated': this.onReplayTargetCreated,
      'Session.devtoolsTargetOpened': this.onDevtoolsTargetOpened,
      'Datastore.getOutput': this.getDatastoreOutput,
      'Datastore.getCollectedAssets': this.getCollectedAssets,
      'Datastore.rerunRunner': this.rerunRunner,
      'DevtoolsBackdoor.toggleInspectElementMode': this.toggleInspectElementMode,
      'DevtoolsBackdoor.highlightNode': this.highlightNode,
      'DevtoolsBackdoor.hideHighlight': this.hideHighlight,
      'DevtoolsBackdoor.generateQuerySelector': this.generateQuerySelector,
    };

    this.sessionId = db.sessionId;
    this.replayAppWindow = new AppReplayWindowController(
      this.sessionId,
      devtoolsConnection,
      this.sendApiEvent,
    );
    this.logger = log.createChild(module, { sessionId: this.sessionId });
    this.scriptInstanceMeta = options.scriptInstanceMeta;
    this.worldHeroSessionIds.add(this.sessionId);

    this.timetravelPlayer = TimetravelPlayer.create(this.sessionId, this);
    this.events.on(this.timetravelPlayer, 'new-tick-command', this.sendCommandFocusedEvent);
    this.events.on(this.timetravelPlayer, 'new-paint-index', this.sendPaintIndexEvent);
    this.events.on(this.timetravelPlayer, 'new-offset', this.sendTimetravelOffset);

    this.scriptLastModifiedTime = Fs.statSync(this.scriptInstanceMeta.entrypoint).mtimeMs;
    this.selectorRecommendations = new SelectorRecommendations(this.scriptInstanceMeta);

    if (this.scriptInstanceMeta.entrypoint.endsWith('.ts')) {
      this.scriptEntrypointTs = this.scriptInstanceMeta.entrypoint;
    }
    if (this.options.input) {
      this.inputBytes = Buffer.byteLength(JSON.stringify(this.options.input));
    }
    this.sourceCodeTimeline = new SourceCodeTimeline(this.scriptInstanceMeta.entrypoint);
    const sourceCode = this.sourceCodeTimeline;
    this.events.on(sourceCode, 'command', this.sendApiEvent.bind(this, 'Command.updated'));
    this.events.on(sourceCode, 'source', this.sendApiEvent.bind(this, 'SourceCode.updated'));

    this.watchHandle = Fs.watch(
      this.scriptInstanceMeta.entrypoint,
      {
        persistent: false,
      },
      this.onScriptEntrypointUpdated,
    );
  }

  public bindLiveSession(heroSession: HeroSession): void {
    this.playbackState = 'running';
    this.liveSession = heroSession;
    this.sourceCodeTimeline.listen(heroSession);
    this.resourceSearch = new ResourceSearch(heroSession, this.events);
    this.events.on(heroSession, 'kept-alive', this.onHeroSessionKeptAlive);
    this.events.on(heroSession, 'resumed', this.onHeroSessionResumed);
    this.events.on(heroSession, 'output', this.onOutputUpdated);
    this.events.on(heroSession, 'collected-asset', this.onCollectedAsset);
    this.events.on(heroSession, 'tab-created', this.onTabCreated);
    this.events.on(heroSession.commands, 'pause', this.onCommandsPaused);
    this.events.on(heroSession.commands, 'resume', this.onCommandsResumed);

    this.timelineWatch = new TimelineWatch(heroSession, {
      extendAfterCommands: 1e3,
      extendAfterLoadStatus: {
        status: LoadStatus.PaintingStable,
        msAfterStatus: 2e3,
      },
    });
    this.events.on(this.timelineWatch, 'updated', () => this.sendActiveSession());
  }

  public async loadFromDb(): Promise<void> {
    this.sourceCodeTimeline.loadCommands(this.db.commands.loadHistory());
    const network = await MirrorNetwork.createFromSessionDb(this.db);
    const { tabDetails } = await sessionTicksApi({
      includeCommands: true,
      includeInteractionEvents: true,
      includePaintEvents: true,
      sessionId: this.sessionId,
    });

    for (const { tab, paintEvents, documents } of tabDetails) {
      const mainFrameIds = new Set<number>();
      const domNodePathByFrameId: { [frameId: number]: string } = {};
      for (const frame of tab.frames) {
        if (frame.isMainFrame) mainFrameIds.add(frame.id);
        domNodePathByFrameId[frame.id] = frame.domNodePath;
      }
      const mirrorPage = new MirrorPage(network, {
        paintEvents,
        documents,
        domNodePathByFrameId,
        mainFrameIds,
      });
      await this.addReplayTab(tab.id, mirrorPage);
    }
    await this.timetravelPlayer.setTabState(tabDetails);
    if (this.timetravelPlayer.activeTab) {
      this.timetravelPlayer.activeTab.currentTimelineOffsetPct = -1;
      this.timetravelPlayer.activeTab.currentTickIndex = -1;
      await this.timetravelPlayer.activeTab.loadTick(0);
    }
  }

  public setResuming(newSessionId): void {
    this.restartingSessionId = newSessionId;
    this.sendApiEvent('Session.loading');

    this.events.once(this, 'Session.updated', () => {
      this.sendApiEvent('Session.loaded');
    });
  }

  public addConnection(
    transport: ITransportToClient<any>,
    request: IncomingMessage,
  ): TConnectionToChromeAliveSessionClient {
    if (request.url.includes('/devtools')) {
      this.replayTransport = transport;
      this.events.once(transport, 'disconnect', () => {
        this.replayTransport = null;
      });
      return;
    }

    const connection: TConnectionToChromeAliveSessionClient = new ConnectionToClient(
      transport,
      this.apiHandlers,
    );
    this.connections.push(connection);
    this.logger.info('ChromeAlive! Ws Connected');

    this.events.on(connection, 'request', msg => {
      this.logger.stats(`${msg.request.command} (${msg.request?.messageId})`, {
        request: msg.request,
        sessionId: null,
      });
    });
    this.events.on(connection, 'event', msg => {
      this.logger.stats(msg.event.eventType, {
        ...msg,
        sessionId: null,
      });
    });
    this.events.on(connection, 'response', msg => {
      this.logger.info(`${msg.request.command} response (${msg.request?.messageId})`, {
        response: msg.response,
        sessionId: null,
      });
    });
    this.events.once(connection, 'disconnect', () => {
      const idx = this.connections.indexOf(connection);
      if (idx >= 0) this.connections.splice(idx, 1);
    });

    setImmediate(() => {
      connection.sendEvent({ eventType: 'Session.updated', data: this.toHeroSessionEvent() });
      connection.sendEvent({ eventType: 'Datastore.output', data: this.getDatastoreOutput() });
    });
    return connection;
  }

  public getMirrorPage(tabId: number): Promise<MirrorPage> {
    return Promise.resolve(this.mirrorPagesByTabId[tabId]);
  }

  public onMultiverseSession(session: HeroSession): void {
    this.worldHeroSessionIds.add(session.id);
    this.sendActiveSession();
  }

  public bindExtractor(extractorSession: HeroSession): void {
    const evt = this.events.on(extractorSession, 'output', this.onOutputUpdated);
    this.events.once(extractorSession, 'closed', () => this.events.off(evt));
  }

  public relaunchSession(startLocation: 'sessionStart' | 'extraction'): Error | undefined {
    if (startLocation === 'sessionStart') {
      // will automatically send out a restarting playback state

      SourceMapSupport.resetCache();
    }
    const script = this.scriptInstanceMeta.entrypoint;
    const execPath = this.scriptInstanceMeta.execPath;
    const execArgv = this.scriptInstanceMeta.execArgv ?? [];
    const args = [
      `--resumeSessionStartLocation="${startLocation}"`,
      `--resumeSessionId="${this.sessionId}"`,
      '--showChromeAlive',
    ];
    if (startLocation === 'extraction') {
      args.length = 0;
      this.resetExtraction();
      args.push(`--replaySessionId="${this.sessionId}"`, '--mode="browserless"');
    }

    try {
      this.logger.info('Relaunch Session', { execPath, args: [...execArgv, script, ...args] });
      const child = spawn(execPath, [...execArgv, script, ...args], {
        cwd: this.scriptInstanceMeta.workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, ULX_CLI_NOPROMPT: 'true', ULX_DATASTORE_DISABLE_AUTORUN: 'false' },
      });
      child.stderr.setEncoding('utf8');
      child.stdout.setEncoding('utf8');
      const session = this.liveSession;
      if (session) {
        this.events.on(child.stderr, 'data', msg => {
          session.awaitedEventEmitter.emit('rerun-stderr', msg);
        });
        this.events.on(child.stdout, 'data', msg => {
          session.awaitedEventEmitter.emit('rerun-stdout', msg);
        });
      }
    } catch (error) {
      this.logger.error('ERROR resuming session', { error });
      return error;
    }
  }

  public toHeroSessionEvent(): IHeroSessionUpdatedEvent {
    const commandTimeline = CommandTimeline.fromDb(this.db);

    const db = this.db;

    const mainFrameIds = db.frames.mainFrameIds();

    const urls: ITimelineMetadata['urls'] = [];

    const loadStatusLookups = [
      [LoadStatus.HttpRequested, 'Http Requested'],
      [LoadStatus.JavascriptReady, 'Document Open'],
    ];

    const urlChangeTimestamps: number[] = [];
    for (const nav of commandTimeline.loadedNavigations) {
      if (!mainFrameIds.has(nav.frameId)) continue;

      const urlOffset =
        urls.length === 0 ? 0 : commandTimeline.getTimelineOffsetForTimestamp(nav.initiatedTime);
      if (urlOffset === -1) continue;

      const entry: ITimelineMetadata['urls'][0] = {
        tabId: nav.tabId,
        url: nav.finalUrl ?? nav.requestedUrl,
        offsetPercent: urlOffset,
        navigationId: nav.id,
        loadStatusOffsets: [],
      };
      urls.push(entry);

      for (const [loadStatus, name] of loadStatusLookups) {
        const timestamp = nav.statusChanges.get(loadStatus as LoadStatus);
        const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(timestamp);
        if (loadStatus === LoadStatus.HttpResponded) {
          urlChangeTimestamps.push(nav.initiatedTime);
        }
        if (offsetPercent !== -1) {
          entry.loadStatusOffsets.push({
            timestamp,
            loadStatus: loadStatus as LoadStatus,
            status: name,
            offsetPercent,
          });
        }
      }
    }

    const paintEvents: ITimelineMetadata['paintEvents'] = [];
    let domChangeForUrl = 0;
    for (const [timestamp, domChanges] of db.domChanges.countByTimestamp) {
      // if we got back the response, reset our counter
      if (urlChangeTimestamps.length && timestamp > urlChangeTimestamps[0]) {
        urlChangeTimestamps.shift();
        domChangeForUrl = 0;
      }
      domChangeForUrl += domChanges;
      const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(timestamp);
      if (offsetPercent === -1) continue;
      paintEvents.push({
        domChanges: domChangeForUrl,
        offsetPercent,
      });
    }
    this.lastTimelineMetadata = {
      urls,
      paintEvents,
      screenshots: [],
      storageEvents: [],
    };

    return {
      heroSessionId: this.sessionId,
      dbPath: this.db.path,
      startTime: commandTimeline.startTime,
      endTime: commandTimeline.endTime,
      runtimeMs: commandTimeline.runtimeMs,
      inputBytes: this.inputBytes,
      playbackState: this.playbackState,
      scriptEntrypoint: this.scriptInstanceMeta.entrypoint,
      scriptEntrypointTs: this.scriptEntrypointTs,
      scriptLastModifiedTime: this.scriptLastModifiedTime,
      timeline: this.lastTimelineMetadata,
    };
  }

  public getSourceCodeAtCommandId(commandId: number): (ISourceCodeLocation & { code: string })[] {
    const command = this.db.commands.loadHistory().find(x => x.id === commandId);
    if (!command) return [];
    return command.callsite.map(x => SourceLoader.getSource(x));
  }

  public addSourceCodeLocation(record: { commandId: number } & ISourceCodeReference): void {
    record.sourcecode = this.getSourceCodeAtCommandId(record.commandId);
  }

  public onCollectedAsset(event: HeroSession['EventTypes']['collected-asset']): void {
    const sendEvent: IDatastoreCollectedAssetEvent = {};

    if (event.type === 'resource') {
      sendEvent.detachedResource = event.asset as any;
      this.addSourceCodeLocation(sendEvent.detachedResource);
    }
    if (event.type === 'element') {
      sendEvent.detachedElement = event.asset as any;
      this.addSourceCodeLocation(sendEvent.detachedElement);
    }
    if (event.type === 'snippet') {
      sendEvent.snippet = event.asset as any;
      this.addSourceCodeLocation(sendEvent.snippet);
    }
    this.sendDatastoreCollectedAssetsEvent(sendEvent);
  }

  public onTabCreated(event: HeroSession['EventTypes']['tab-created']): void {
    const { tab } = event;
    this.events.on(tab, 'page-events', this.sendDomRecordingUpdates.bind(this, tab));

    const mirrorPage = tab.createMirrorPage(false);
    mirrorPage.showChromeInteractions = true;
    void this.addReplayTab(tab.id, mirrorPage);
  }

  public async addReplayTab(tabId: number, mirrorPage: MirrorPage): Promise<void> {
    const isFirstTab = Object.keys(this.mirrorPagesByTabId).length === 0;
    this.mirrorPagesByTabId[tabId] = mirrorPage;

    try {
      this.sendApiEvent('Session.tabCreated', { tabId });

      const page = await this.replayAppWindow.waitForPageWithHeroTabId(tabId);
      await mirrorPage.attachToPage(page, this.sessionId);
      if (isFirstTab) {
        await this.sendApiEvent('Session.loaded');
        await this.openMode({ mode: this.liveSession ? 'Live' : 'Timetravel' });
      }
    } catch (error) {
      this.logger.error('ERROR setting up mirrorPage', { error, tabId });
    }
  }

  public sendDomRecordingUpdates(tab: Tab, events: Tab['EventTypes']['page-events']): void {
    if (!events.records.domChanges?.length) return;
    const timestamp = this.lastDomChangesByTabId[tab.id];
    const domRecording = tab.mirrorPage.getDomRecordingSince(timestamp);

    this.lastDomChangesByTabId[tab.id] =
      domRecording.paintEvents[domRecording.paintEvents.length - 1].timestamp;

    this.refreshLiveMirrorPage(tab.id).catch(console.error);

    this.sendApiEvent('Dom.updated', {
      paintEvents: domRecording.paintEvents.map(x => x.changeEvents),
      framesById: tab.session.db.frames.framesById,
    });
  }

  public async refreshLiveMirrorPage(tabId: number, force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.mirrorPagePauseRefreshing) {
      clearTimeout(this.mirrorRefreshTimeout);
      this.mirrorRefreshTimeout = setTimeout(
        this.refreshLiveMirrorPage.bind(this, tabId),
        1e3,
      ).unref();
      return;
    }

    if (!force && this.mirrorRefreshLastUpdated && now - this.mirrorRefreshLastUpdated < 100) {
      if (!this.mirrorRefreshTimeout) {
        this.mirrorRefreshTimeout = setTimeout(
          this.refreshLiveMirrorPage.bind(this, tabId),
          now - this.mirrorRefreshLastUpdated,
        ).unref();
        return;
      }
    }
    clearTimeout(this.mirrorRefreshTimeout);
    this.mirrorRefreshTimeout = null;
    this.mirrorRefreshLastUpdated = now;

    try {
      await this.replayAppWindow.waitForPageWithHeroTabId(tabId);
      await this.mirrorPagesByTabId[tabId].load();
    } catch (error) {
      if (!(error instanceof CanceledPromiseError))
        this.logger.error('ERROR loading mirror page to latest', { error });
    }
  }

  public async getDomRecording(tabId?: number): ReturnType<ISessionApi['getDom']> {
    tabId ??=
      this.timetravelPlayer.activeTab?.id ?? Number(Object.keys(this.mirrorPagesByTabId)[0] ?? 1);
    const mirrorPage = await this.getMirrorPage(tabId);
    return {
      ...mirrorPage?.domRecording,
      framesById: this.db.frames.framesById,
    };
  }

  /// ////// API ROUTING /////////////

  public getScreenshot(): {
    imageBase64: string;
  } {
    throw new Error('Not implemented');
  }

  public load(): ReturnType<ISessionApi['load']> {
    return Promise.resolve(this.toHeroSessionEvent());
  }

  public async close(): Promise<void> {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
    this.sourceCodeTimeline.close();
    this.events.close();

    for (const connection of this.connections) {
      await connection.disconnect();
    }
    for (const mirrorPage of Object.values(this.mirrorPagesByTabId)) {
      mirrorPage.close().catch(console.error);
    }
    clearTimeout(this.mirrorRefreshTimeout);

    this.timelineWatch?.close();
    this.timetravelPlayer?.close()?.catch(console.error);
    this.emit('closed');
    this.sendApiEvent('Session.closed');
  }

  public async onReplayTargetCreated(
    args?: Parameters<ISessionApi['replayTargetCreated']>[0],
  ): ReturnType<ISessionApi['replayTargetCreated']> {
    await this.replayAppWindow.addTarget(args);
  }

  public async onDevtoolsTargetOpened(
    args?: Parameters<ISessionApi['devtoolsTargetOpened']>[0],
  ): ReturnType<ISessionApi['devtoolsTargetOpened']> {
    await this.replayAppWindow.onDevtoolsOpened(args);
  }

  public getScriptState(
  ): ReturnType<ISessionApi['getScriptState']> {
    return Promise.resolve({
      ...this.sourceCodeTimeline.getCurrentState(),
      focusedCommandId: this.timetravelPlayer.activeTab?.currentTick?.commandId,
    });
  }

  public getDom(args?: Parameters<ISessionApi['getDom']>[0]): ReturnType<ISessionApi['getDom']> {
    return this.getDomRecording(args?.tabId);
  }

  public getMeta(): ReturnType<ISessionApi['getMeta']> {
    return this.db.session.getHeroMeta();
  }

  public getTimetravelState(): ReturnType<ISessionApi['getTimetravelState']> {
    const activeTab = this.timetravelPlayer.activeTab;
    const tick = activeTab?.currentTick;
    return Promise.resolve({
      activeCommandId: tick?.commandId ?? 1,
      documentLoadPaintIndex: tick?.documentLoadPaintIndex ?? -1,
      highlightPaintIndexRange: activeTab?.focusedPaintIndexes,
      percentOffset: this.mode === 'Live' ? 100 : activeTab?.currentTimelineOffsetPct ?? 0,
    });
  }

  public async timetravel(args: Parameters<ISessionApi['timetravel']>[0]): Promise<{
    timelineOffsetPercent: number;
  }> {
    try {
      await this.replayAppWindow.waitForPageWithHeroTabId(this.timetravelPlayer.activeTab?.id);
      await this.timetravelPlayer.setFocusedOffsetRange(args.timelinePercentRange);

      if (args.step) {
        const tickIndex = this.timetravelPlayer.activeTab.currentTickIndex;
        if (
          args.step === 'forward' &&
          tickIndex === this.timetravelPlayer.activeTab.ticks.length - 1
        ) {
          if (this.liveSession) {
            await this.openMode({ mode: 'Live' });
          }
          this.sendTimetravelOffset({
            tabId: this.timetravelPlayer.activeTab.id,
            percentOffset: 100,
            focusedRange: undefined,
          });
          return { timelineOffsetPercent: 100 };
        }
        await this.timetravelPlayer.step(args.step);
      } else {
        let percentOffset = args.percentOffset;
        if (args.commandId) {
          percentOffset = await this.timetravelPlayer.findCommandPercentOffset(args.commandId);
        }
        await this.timetravelPlayer.goto(percentOffset ?? 100);
      }

      if (this.mode !== 'Timetravel') {
        await this.openMode({ mode: 'Timetravel' });
      }
      await this.timetravelPlayer.showLoadStatus(this.lastTimelineMetadata);
      const timelineOffsetPercent = this.timetravelPlayer.activeTab.currentTimelineOffsetPct;
      return { timelineOffsetPercent };
    } catch (err) {
      if (err instanceof CanceledPromiseError) {
        return { timelineOffsetPercent: 100 };
      }
      throw err;
    }
  }

  public async openMode(args: Parameters<ISessionApi['openMode']>[0]): Promise<void> {
    try {
      const mode = args.mode;
      this.isSearchingTimetravel = false;
      if (mode === 'Finder') {
        // if coming from timetravel, we'll use the timetravel player
        if (this.mode === 'Timetravel') {
          this.isSearchingTimetravel = true;
        }
      }

      this.mode = mode;
      this.sendAppModeEvent();
      if (this.mode === 'Finder') {
        await this.replayAppWindow.showElementsPanel();
      }
    } catch (err) {
      console.error('ERROR opening player mode %s', args.mode, err);
    }
  }

  public pause(): void {
    this.liveSession?.pauseCommands().catch(() => null);
  }

  public async resume(args: ISessionResumeArgs): Promise<{
    success: boolean;
    error?: Error;
  }> {
    if (args.startLocation === 'currentLocation') {
      this.liveSession?.resumeCommands().catch(() => null);
      return { success: true };
    }

    const error = await this.relaunchSession(args.startLocation);

    return {
      success: !error,
      error,
    };
  }

  public async search(
    args?: Parameters<ISessionApi['search']>[0],
  ): ReturnType<ISessionApi['search']> {
    const query = args.query;

    if (!this.lastTimelineMetadata) this.toHeroSessionEvent();
    const metadata = this.lastTimelineMetadata;
    const lastUrl = metadata.urls[metadata.urls.length - 1];
    const commandTimeline = CommandTimeline.fromDb(this.db);
    const lastNavigation = commandTimeline.navigationsById.get(lastUrl.navigationId);
    let tabId = lastUrl.tabId;
    let startTime =
      lastNavigation.statusChanges.get('HttpRequested') ??
      lastNavigation.statusChanges.get('HttpResponded');
    let endTime = commandTimeline.endTime;
    let documentUrl = lastNavigation.finalUrl ?? lastNavigation.requestedUrl;
    if (this.isSearchingTimetravel) {
      const tab = this.timetravelPlayer.activeTab;
      tabId = tab.id;
      documentUrl = tab.currentTick.documentUrl;
      if (!tab.focusedOffsetRange) {
        const documentLoadTime = tab.getPaintEventAtIndex(
          tab.currentTick.documentLoadPaintIndex,
        )?.timestamp;
        if (documentLoadTime) startTime = documentLoadTime;
        endTime = tab.currentTick.timestamp;
      } else {
        const focusedTicks = tab.focusedPaintIndexes;
        startTime = tab.getPaintEventAtIndex(focusedTicks[0])?.timestamp;
        endTime = tab.getPaintEventAtIndex(focusedTicks[1])?.timestamp;
      }
    }
    const searchingContext = {
      baseTime: commandTimeline.startTime,
      startTime,
      tabId,
      endTime,
      documentUrl,
    };

    return {
      searchingContext,
      elements: await this.devtoolsBackdoorModule.searchDom(query),
      resources: this.resourceSearch.search(query, searchingContext),
    };
  }

  public async getCollectedAssets(): Promise<IDatastoreCollectedAssets> {
    const assetNames = await DetachedAssets.getNames(this.db);
    const result: IDatastoreCollectedAssets = {
      detachedElements: [],
      detachedResources: [],
      snippets: [],
    };
    for (const name of assetNames.elements) {
      const elements = DetachedAssets.getElements(this.db, name);
      for (const element of elements as IDatastoreCollectedAssets['detachedElements']) {
        this.addSourceCodeLocation(element);
        result.detachedElements.push(element);
      }
    }
    for (const name of assetNames.resources) {
      const resources = await DetachedAssets.getResources(this.db, name);
      for (const resource of resources as IDatastoreCollectedAssets['detachedResources']) {
        this.addSourceCodeLocation(resource);
        result.detachedResources.push(resource);
      }
    }
    for (const name of assetNames.snippets) {
      const snippets = DetachedAssets.getSnippets(this.db, name);
      for (const snippet of snippets as IDatastoreCollectedAssets['snippets']) {
        this.addSourceCodeLocation(snippet);
        result.snippets.push(snippet);
      }
    }
    return result;
  }

  public getDatastoreOutput(): IDatastoreOutputEvent {
    return (
      this.outputRebuilder.getLatestSnapshot() ?? {
        bytes: 0,
        output: null,
        changes: [],
      }
    );
  }

  public async rerunRunner(): Promise<{
    success: boolean;
    error?: Error;
  }> {
    const error = await this.relaunchSession('extraction');

    return {
      success: !error,
      error,
    };
  }

  public async toggleInspectElementMode(): Promise<void> {
    try {
      await this.devtoolsBackdoorModule.toggleInspectElementMode();
    } catch (error) {
      console.error('ERROR toggleInspectElementMode', error);
    }
  }

  public async highlightNode(id: { backendNodeId?: number; objectId?: string }): Promise<void> {
    try {
      await this.elementsModule.highlightNode(id);
    } catch (error) {
      console.error('ERROR highlightNode', error);
    }
  }

  public async hideHighlight(): Promise<void> {
    try {
      await this.elementsModule.hideHighlight();
    } catch (error) {
      console.error('ERROR hideHighlight', error);
    }
  }

  public async generateQuerySelector(id: {
    backendNodeId?: number;
    objectId?: string;
  }): Promise<ISelectorMap> {
    try {
      const selectorMap = await this.elementsModule.generateQuerySelector(id);
      const activePageUrl = this.timetravelPlayer.activeTab?.mirrorPage.page.mainFrame.url;

      void this.selectorRecommendations
        .save(selectorMap, activePageUrl)
        .catch(err => console.error('ERROR saving selector map', err));

      selectorMap.topMatches = selectorMap.topMatches.slice(0, 50);
      return selectorMap;
    } catch (error) {
      console.error('ERROR generateQuerySelector', error);
      throw error;
    }
  }

  private async onScriptEntrypointUpdated(action: string): Promise<void> {
    if (action !== 'change') return;
    const stats = await Fs.promises.stat(this.scriptInstanceMeta.entrypoint);
    this.scriptLastModifiedTime = stats.mtimeMs;
    this.hasScriptUpdatesSinceLastRun = true;
    this.sendActiveSession();
  }

  private onHeroSessionResumed(): void {
    this.playbackState = 'running';
    this.outputRebuilder = new OutputRebuilder();
    this.sourceCodeTimeline.clearCache();
    this.mirrorPagePauseRefreshing = false;
    this.hasScriptUpdatesSinceLastRun = false;
    this.sendActiveSession();
    this.sendDatastoreUpdatedEvent();
  }

  private onCommandsPaused(): void {
    this.playbackState = 'paused';
    this.sendActiveSession();
  }

  private onCommandsResumed(): void {
    this.playbackState = 'running';
    this.sendActiveSession();
  }

  private onHeroSessionKeptAlive(event: { message: string }): void {
    this.playbackState = 'finished';
    this.mirrorPagePauseRefreshing = true;
    this.sendActiveSession();
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private resetExtraction(): void {
    this.outputRebuilder = new OutputRebuilder();
    this.sendDatastoreUpdatedEvent();
  }

  private onOutputUpdated(event: { changes: IOutputChangeRecord[] }): void {
    this.outputRebuilder.applyChanges(event.changes);
    this.sendDatastoreUpdatedEvent();
  }

  private sendCommandFocusedEvent(event: TimetravelPlayer['EventTypes']['new-tick-command']): void {
    this.sendDatastoreUpdatedEvent();
    this.sendApiEvent('Command.focused', event);
  }

  private sendTimetravelOffset(event: TimetravelPlayer['EventTypes']['new-offset']): void {
    this.sendApiEvent('Session.timetravel', {
      ...event,
      url: this.timetravelPlayer.activeTab.mirrorPage.page.mainFrame.url,
    });
  }

  private sendPaintIndexEvent(event: TimetravelPlayer['EventTypes']['new-paint-index']): void {
    this.sendApiEvent('Dom.focus', {
      highlightPaintIndexRange: event.paintIndexRange,
      documentLoadPaintIndex: event.documentLoadPaintIndex,
    });
  }

  private sendActiveSession(): void {
    this.sendApiEvent('Session.updated', this.toHeroSessionEvent());
  }

  private sendDatastoreUpdatedEvent(): void {
    this.sendApiEvent('Datastore.output', this.getDatastoreOutput());
  }

  private sendDatastoreCollectedAssetsEvent(event: IDatastoreCollectedAssetEvent): void {
    this.sendApiEvent('Datastore.collected-asset', event);
  }

  private sendAppModeEvent(): void {
    this.sendApiEvent('Session.appMode', { mode: this.mode });
  }

  private sendApiEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T] = null,
  ): void {
    for (const connection of this.connections) {
      connection.sendEvent({ eventType, data });
    }
  }
}
