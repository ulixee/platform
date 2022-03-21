import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import type { IOutputChangeRecord } from '@ulixee/hero-core/models/OutputTable';
import IDataboxOutputEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxOutputEvent';
import IDataboxCollectedAssets from '@ulixee/apps-chromealive-interfaces/IDataboxCollectedAssets';
import IDataboxCollectedAssetEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxCollectedAssetEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';
import * as Path from 'path';
import { fork } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import ChromeAliveCore from '../index';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';
import AliveBarPositioner from './AliveBarPositioner';
import OutputRebuilder, { IOutputSnapshot } from './OutputRebuilder';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import SourceCodeTimeline from './SourceCodeTimeline';
import ISessionApi from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import VueScreen from './VueScreen';
import DevtoolsBackdoorModule from './hero-plugin-modules/DevtoolsBackdoorModule';
import ElementsModule from './hero-plugin-modules/ElementsModule';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import SourceLoader from '@ulixee/commons/lib/SourceLoader';
import ISourceCodeLocation from '@ulixee/commons/interfaces/ISourceCodeLocation';
import ISourceCodeReference from '@ulixee/hero-interfaces/ISourceCodeReference';
import MirrorPage from '@ulixee/hero-timetravel/lib/MirrorPage';
import HeroCorePlugin from './HeroCorePlugin';
import CommandTimeline from '@ulixee/hero-timetravel/lib/CommandTimeline';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';

const { log } = Log(module);

export default class SessionObserver extends TypedEventEmitter<{
  'hero:updated': void;
  'databox:output': void;
  'databox:asset': IDataboxCollectedAssetEvent;
  timetravel: { timelineOffsetPercent: number };
  'app:mode': void;
  closed: void;
}> {
  public mode: IAppModeEvent['mode'] = 'Live';
  public playbackState: IHeroSessionActiveEvent['playbackState'] = 'running';

  public readonly timetravelPlayer: TimetravelPlayer;
  public readonly timelineRecorder: TimelineRecorder;
  public readonly scriptInstanceMeta: IScriptInstanceMeta;
  public readonly sourceCodeTimeline: SourceCodeTimeline;

  public readonly liveMirrorPagesByTabId: { [tabId: number]: MirrorPage } = {};

  public readonly worldHeroSessionIds = new Set<string>();

  public get heroCorePlugin(): HeroCorePlugin {
    return HeroCorePlugin.bySessionId.get(this.heroSession.id);
  }

  public get tabGroupModule(): TabGroupModule {
    return this.heroCorePlugin.tabGroupModule;
  }

  public get devtoolsBackdoorModule(): DevtoolsBackdoorModule {
    return this.heroCorePlugin.devtoolsBackdoorModule;
  }

  public get elementsModule(): ElementsModule {
    return this.heroCorePlugin.elementsModule;
  }

  public mirrorPagePauseRefreshing = false;

  private sessionHasChangesRequiringRestart = false;
  private vueScreensByName: { [name: string]: VueScreen } = {};

  private scriptLastModifiedTime: number;
  private outputRebuilder = new OutputRebuilder();
  private hasScriptUpdatesSinceLastRun = false;
  private watchHandle: Fs.FSWatcher;
  private events = new EventSubscriber();
  private readonly lastDomChangesByTabId: Record<number, number> = {};
  private mirrorRefreshLastUpdated: number;
  private mirrorRefreshTimeout: NodeJS.Timeout;
  private lastTimelineMetadata: ITimelineMetadata;

  constructor(public readonly heroSession: HeroSession) {
    super();
    bindFunctions(this);
    this.logger = log.createChild(module, { sessionId: heroSession.id });
    this.scriptInstanceMeta = heroSession.options.scriptInstanceMeta;
    this.worldHeroSessionIds.add(heroSession.id);

    this.events.on(this.heroSession, 'kept-alive', this.onHeroSessionKeptAlive);
    this.events.on(this.heroSession, 'resumed', this.onHeroSessionResumed);
    this.events.on(this.heroSession, 'closing', this.close);
    this.events.on(this.heroSession, 'output', this.onOutputUpdated);
    this.events.on(this.heroSession, 'collected-asset', this.onCollectedAsset);
    this.events.on(this.heroSession, 'tab-created', this.onTabCreated);

    this.timelineRecorder = new TimelineRecorder(heroSession);
    this.events.on(this.timelineRecorder, 'updated', () => this.emit('hero:updated'));

    this.timetravelPlayer = TimetravelPlayer.create(heroSession.id, heroSession);
    this.events.on(this.timetravelPlayer, 'tab-opened', this.onTimetravelTabOpened);

    this.scriptLastModifiedTime = Fs.statSync(this.scriptInstanceMeta.entrypoint).mtimeMs;

    this.sourceCodeTimeline = new SourceCodeTimeline(heroSession);

    this.watchHandle = Fs.watch(
      this.scriptInstanceMeta.entrypoint,
      {
        persistent: false,
      },
      this.onScriptEntrypointUpdated,
    );
  }

  public onMultiverseSession(session: HeroSession): void {
    this.worldHeroSessionIds.add(session.id);
    this.emit('hero:updated');
  }

  public bindExtractor(extractorSession: HeroSession): void {
    const evt = this.events.on(extractorSession, 'output', this.onOutputUpdated);
    this.events.once(extractorSession, 'closed', () => this.events.off(evt));
  }

  public async relaunchSession(
    startLocation: ISessionCreateOptions['sessionResume']['startLocation'] | 'extraction',
    startNavigationId?: number,
  ): Promise<Error | undefined> {
    if (startLocation === 'sessionStart' || this.sessionHasChangesRequiringRestart) {
      ChromeAliveCore.restartingHeroSessionId = this.heroSession.id;
      AliveBarPositioner.restartingSession(this.heroSession.id);
      await this.heroSession.close(true);
    }
    const script = this.scriptInstanceMeta.entrypoint;
    const execArgv = [
      `--sessionResume.startLocation`,
      startLocation,
      `--sessionResume.sessionId`,
      this.heroSession.id,
    ];
    if (startNavigationId) {
      execArgv.push(`--sessionResume.startNavigationId`, String(startNavigationId));
    }
    if (startLocation === 'extraction') {
      execArgv.length = 0;
      this.resetExtraction();
      execArgv.push('--extractSessionId', this.heroSession.id, '--mode', 'browserless');
    }
    if (script.endsWith('.ts')) {
      execArgv.push('-r', 'ts-node/register');
    }

    try {
      const child = fork(script, execArgv, {
        // execArgv,
        cwd: this.scriptInstanceMeta.workingDirectory,
        stdio: ['ignore', 'inherit', 'pipe', 'ipc'],
        env: { ...process.env, HERO_CLI_NOPROMPT: 'true' },
      });
      child.stderr.setEncoding('utf-8');
      const evt = this.events.on(child.stderr, 'data', x => {
        if (x.includes('ScriptChangedNeedsRestartError')) {
          this.relaunchSession('sessionStart').catch(() => null);
        }
      });
      this.events.once(child, 'exit', () => this.events.off(evt));
    } catch (error) {
      this.logger.error('ERROR resuming session', { error });
      return error;
    }
  }

  public async toggleInspectElementMode(): Promise<void> {
    await this.devtoolsBackdoorModule.toggleInspectElementMode();
  }

  public async highlightNode(backendNodeId: number): Promise<void> {
    await this.elementsModule.highlightNode(backendNodeId);
  }

  public async hideHighlight(): Promise<void> {
    await this.elementsModule.hideHighlight();
  }

  public async searchElements(text: string): Promise<any[]> {
    return await this.devtoolsBackdoorModule.searchDom(text);
  }

  public async generateQuerySelector(backendNodeId: number): Promise<any> {
    return await this.elementsModule.generateQuerySelector(backendNodeId);
  }

  public async openPlayer(): Promise<void> {
    this.mirrorPagePauseRefreshing = false;
    if (
      !this.timetravelPlayer.isOpen ||
      this.timetravelPlayer.activeTab.currentTimelineOffsetPct === 100
    ) {
      await this.showSessionTabs();
    } else {
      await this.showTimetravelTabs();
    }
  }

  public async openMode(mode: Parameters<ISessionApi['openMode']>[0]['mode']): Promise<void> {
    this.mirrorPagePauseRefreshing = mode === 'Finder';
    if (mode === 'Finder') {
      const activeTabId = this.heroSession.getLastActiveTab().id;
      const mirrorPage = this.liveMirrorPagesByTabId[activeTabId];
      await this.tabGroupModule.showTabs(mirrorPage.page);
    } else if (mode === 'Live' || mode === 'Timetravel') {
      await this.openPlayer();
    } else {
      const tabExists = !!this.vueScreensByName[mode];
      this.vueScreensByName[mode] ??= new VueScreen(mode, this.heroSession);
      const vueScreen = this.vueScreensByName[mode];
      if (!tabExists) {
        this.events.once(vueScreen, 'close', () => delete this.vueScreensByName[mode]);
        await vueScreen.open();
      }
      const puppetPage = await vueScreen.puppetPage;
      await this.tabGroupModule.showTabs(puppetPage);
    }

    this.mode = mode;
    this.emit('app:mode');
  }

  public close(): void {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
    this.sourceCodeTimeline.close();
    this.events.close();

    for (const screen of Object.values(this.vueScreensByName)) {
      screen.close().catch(console.error);
    }

    for (const mirrorPage of Object.values(this.liveMirrorPagesByTabId)) {
      mirrorPage.close().catch(console.error);
    }

    this.timelineRecorder.close();
    this.timetravelPlayer?.close()?.catch(console.error);
    this.emit('closed');
  }

  public getScriptDetails(): Pick<
    IHeroSessionActiveEvent,
    'scriptEntrypoint' | 'scriptLastModifiedTime'
  > {
    return {
      scriptEntrypoint: this.scriptInstanceMeta.entrypoint.split(Path.sep).slice(-2).join(Path.sep),
      scriptLastModifiedTime: this.scriptLastModifiedTime,
    };
  }

  public getHeroSessionEvent(): IHeroSessionActiveEvent {
    const commandTimeline = CommandTimeline.fromSession(this.heroSession);

    const db = this.heroSession.db;

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

      urls.push({
        tabId: nav.tabId,
        url: nav.finalUrl ?? nav.requestedUrl,
        offsetPercent: urlOffset,
        navigationId: nav.id,
        loadStatusOffsets: [],
      });
      const lastUrl = urls[urls.length - 1];

      for (const [loadStatus, name] of loadStatusLookups) {
        const timestamp = nav.statusChanges.get(loadStatus as LoadStatus);
        const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(timestamp);
        if (loadStatus === LoadStatus.HttpResponded) {
          urlChangeTimestamps.push(nav.initiatedTime);
        }
        if (offsetPercent !== -1) {
          lastUrl.loadStatusOffsets.push({
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
      run: this.heroSession.commands.resumeCounter,
      heroSessionId: this.heroSession.id,
      startTime: commandTimeline.startTime,
      endTime: commandTimeline.endTime,
      runtimeMs: commandTimeline.runtimeMs,
      mode: this.mode,
      inputBytes: this.heroSession.meta.input
        ? Buffer.byteLength(JSON.stringify(this.heroSession.meta.input))
        : 0,
      playbackState: this.playbackState,
      worldHeroSessionIds: [...this.worldHeroSessionIds],
      ...this.getScriptDetails(),
      timeline: this.lastTimelineMetadata,
    };
  }

  public async getCollectedAssets(fromSessionId?: string): Promise<IDataboxCollectedAssets> {
    const sessionId = fromSessionId ?? this.heroSession.id;
    const assetNames = await this.heroSession.getCollectedAssetNames(sessionId);
    const result: IDataboxCollectedAssets = {
      collectedElements: [],
      collectedResources: [],
      collectedSnippets: [],
    };
    for (const name of assetNames.elements) {
      const elements = await this.heroSession.getCollectedElements(sessionId, name);
      for (const element of elements as IDataboxCollectedAssets['collectedElements']) {
        this.addSourceCodeLocation(element);
        result.collectedElements.push(element);
      }
    }
    for (const name of assetNames.resources) {
      const resources = await this.heroSession.getCollectedResources(sessionId, name);
      for (const resource of resources as IDataboxCollectedAssets['collectedResources']) {
        this.addSourceCodeLocation(resource);
        result.collectedResources.push(resource);
      }
    }
    for (const name of assetNames.snippets) {
      const snippets = await this.heroSession.getCollectedSnippets(sessionId, name);
      for (const snippet of snippets as IDataboxCollectedAssets['collectedSnippets']) {
        this.addSourceCodeLocation(snippet);
        result.collectedSnippets.push(snippet);
      }
    }
    return result;
  }

  public getDataboxEvent(): IDataboxOutputEvent {
    const output: IOutputSnapshot = this.outputRebuilder.getLatestSnapshot() ?? {
      bytes: 0,
      output: null,
      changes: [],
    };
    return {
      ...output,
    };
  }

  public async timetravel(
    option: Parameters<ISessionApi['timetravel']>[0],
  ): Promise<{ timelineOffsetPercent: number }> {
    await this.timetravelPlayer.setFocusedOffsetRange(option.timelinePercentRange);

    let percentOffset: number;
    if (option.step) {
      percentOffset = await this.timetravelPlayer.step(option.step);
    } else {
      if (option.commandId) {
        percentOffset = await this.timetravelPlayer.findCommandPercentOffset(option.commandId);
      }
      percentOffset ??= option.percentOffset ?? 100;
      await this.timetravelPlayer.goto(percentOffset);
    }

    if (percentOffset === 100) {
      await this.showSessionTabs();
    } else {
      await this.showTimetravelTabs();
    }

    await this.timetravelPlayer.showLoadStatus(this.lastTimelineMetadata);
    const timelineOffsetPercent = this.timetravelPlayer.activeTab.currentTimelineOffsetPct;
    return { timelineOffsetPercent };
  }

  public getSourceCodeAtCommandId(commandId: number): (ISourceCodeLocation & { code: string })[] {
    const command = this.heroSession.commands.history.find(x => x.id === commandId);
    if (!command) return [];
    return command.callsite.map(x => SourceLoader.getSource(x));
  }

  public addSourceCodeLocation(record: { commandId: number } & ISourceCodeReference): void {
    record.sourcecode = this.getSourceCodeAtCommandId(record.commandId);
  }

  public onCollectedAsset(event: HeroSession['EventTypes']['collected-asset']): void {
    const sendEvent: IDataboxCollectedAssetEvent = {};

    if (event.type === 'resource') {
      sendEvent.collectedResource = event.asset as any;
      this.addSourceCodeLocation(sendEvent.collectedResource);
    }
    if (event.type === 'element') {
      sendEvent.collectedElement = event.asset as any;
      this.addSourceCodeLocation(sendEvent.collectedElement);
    }
    if (event.type === 'snippet') {
      sendEvent.collectedSnippet = event.asset as any;
      this.addSourceCodeLocation(sendEvent.collectedSnippet);
    }
    this.emit('databox:asset', sendEvent);
  }

  public onTabCreated(event: HeroSession['EventTypes']['tab-created']): void {
    this.events.on(event.tab, 'page-events', this.sendDomRecordingUpdates.bind(this, event.tab));
    const mirrorPage = event.tab.createMirrorPage();
    const shouldAttach = Object.keys(this.liveMirrorPagesByTabId).length === 0;
    this.liveMirrorPagesByTabId[event.tab.id] = mirrorPage;
    if (shouldAttach) {
      mirrorPage
        .attachToPage(this.heroCorePlugin.mirrorPuppetPage, this.heroSession.id)
        .catch(error => this.logger.error('ERROR setting up mirrorPage', { error }));
    }
  }

  public sendDomRecordingUpdates(tab: Tab, events: Tab['EventTypes']['page-events']): void {
    if (!events.records.domChanges?.length) return;
    const timestamp = this.lastDomChangesByTabId[tab.id];
    const domRecording = tab.mirrorPage.getDomRecordingSince(timestamp);

    this.lastDomChangesByTabId[tab.id] =
      domRecording.paintEvents[domRecording.paintEvents.length - 1].timestamp;

    this.refreshLiveMirrorPage(tab.id).catch(console.error);

    ChromeAliveCore.sendAppEvent('Dom.updated', {
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
        500,
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
      await this.liveMirrorPagesByTabId[tabId].load();
    } catch (error) {
      this.logger.error('ERROR loading mirror page to latest', { error });
    }
  }

  public getDomRecording(tabId: number): ReturnType<ISessionApi['getDom']> {
    const tab = this.heroSession.tabsById.get(tabId) ?? this.heroSession.getLastActiveTab();
    const domRecording = {
      ...tab.mirrorPage.domRecording,
      framesById: this.heroSession.db.frames.framesById,
    };
    const last = domRecording.paintEvents[domRecording.paintEvents.length - 1];
    if (last) this.lastDomChangesByTabId[tab.id] = last.timestamp;
    return Promise.resolve(domRecording);
  }

  private async showTimetravelTabs(): Promise<void> {
    if (this.mode === 'Timetravel') return;
    this.mode = 'Timetravel';
    this.emit('app:mode');
    const timetravelPage = this.timetravelPlayer.activeTab.mirrorPage?.page;
    await this.tabGroupModule.showTabs(timetravelPage);
  }

  private async showSessionTabs(): Promise<void> {
    if (this.mode === 'Live') return;

    this.mode = 'Live';
    this.emit('app:mode');
    const sessionPages: IPuppetPage[] = [];
    for (const tab of this.heroSession.tabsById.values()) {
      if (tab.puppetPage.groupName === 'session') {
        sessionPages.push(tab.puppetPage);
      }
    }
    await this.tabGroupModule.showTabs(...sessionPages);
  }

  private async onTimetravelTabOpened(): Promise<void> {
    if (this.mode !== 'Timetravel') return;
    await this.timetravelPlayer.activeTab.mirrorPage.page.bringToFront();
  }

  private async onScriptEntrypointUpdated(action: string): Promise<void> {
    if (action !== 'change') return;
    const stats = await Fs.promises.stat(this.scriptInstanceMeta.entrypoint);
    this.scriptLastModifiedTime = stats.mtimeMs;
    this.hasScriptUpdatesSinceLastRun = true;
    this.emit('hero:updated');
  }

  private onHeroSessionResumed(): void {
    this.playbackState = 'running';
    this.outputRebuilder = new OutputRebuilder();
    this.sourceCodeTimeline.clearCache();
    this.hasScriptUpdatesSinceLastRun = false;
    this.emit('hero:updated');
    this.emit('databox:output');
  }

  private onHeroSessionKeptAlive(event: { message: string }): void {
    this.playbackState = 'paused';
    this.emit('hero:updated');
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private resetExtraction(): void {
    this.outputRebuilder = new OutputRebuilder();
    this.emit('databox:output');
  }

  private onOutputUpdated(event: { changes: IOutputChangeRecord[] }): void {
    this.outputRebuilder.applyChanges(event.changes);
    this.emit('databox:output');
  }
}
