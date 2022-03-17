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
import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
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
  public readonly timelineBuilder: TimelineBuilder;

  public readonly timetravelPlayer: TimetravelPlayer;
  public readonly timelineRecorder: TimelineRecorder;
  public readonly scriptInstanceMeta: IScriptInstanceMeta;
  public readonly worldHeroSessionIds = new Set<string>();
  public readonly sourceCodeTimeline: SourceCodeTimeline;

  private sessionHasChangesRequiringRestart = false;
  private vueScreensByName: { [name: string]: VueScreen } = {};

  private scriptLastModifiedTime: number;
  private outputRebuilder = new OutputRebuilder();
  private hasScriptUpdatesSinceLastRun = false;
  private watchHandle: Fs.FSWatcher;
  private events = new EventSubscriber();
  private readonly lastDomChangesByTabId: Record<number, number> = {};

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

    this.timelineBuilder = new TimelineBuilder({ liveSession: heroSession });

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

  public async openPlayer(): Promise<void> {
    if (
      !this.timetravelPlayer.isOpen ||
      this.timetravelPlayer.activeTab.currentTimelineOffsetPct === 100
    ) {
      await this.showSessionTabs();
    } else {
      await this.showTimetravelTabs();
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

  public async openScreen(
    name: Parameters<ISessionApi['openScreen']>[0]['screenName'],
  ): Promise<void> {
    const tabExists = !!this.vueScreensByName[name];
    this.vueScreensByName[name] ??= new VueScreen(name, this.heroSession);
    const vueScreen = this.vueScreensByName[name];
    if (!tabExists) {
      this.events.once(vueScreen, 'close', () => delete this.vueScreensByName[name]);
      await vueScreen.open();
    }

    this.mode = name;
    this.emit('app:mode');
    const puppetPage = await vueScreen.puppetPage;
    await this.tabGroupModule.showTabs(puppetPage);
  }

  public close(): void {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
    this.sourceCodeTimeline.close();

    this.events.close();
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
    const timeline = this.timelineBuilder.refreshMetadata();
    const commandTimeline = this.timelineBuilder.commandTimeline;

    const currentTab = this.heroSession.getLastActiveTab();

    timeline.urls.push({
      url: currentTab?.url,
      tabId: currentTab?.id,
      navigationId: null, // don't include nav id since we want to resume session at current
      offsetPercent: 100,
      loadStatusOffsets: [],
    });

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
      timeline,
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
    const commandId = this.timetravelPlayer.activeCommandId;

    const output: IOutputSnapshot = this.outputRebuilder.getLatestSnapshot(commandId) ?? {
      bytes: 0,
      output: null,
      changes: [],
    };
    return {
      ...output,
    };
  }

  public get tabGroupModule(): TabGroupModule {
    return TabGroupModule.bySessionId.get(this.heroSession.id);
  }

  public get devtoolsBackdoorModule(): DevtoolsBackdoorModule {
    return DevtoolsBackdoorModule.bySessionId.get(this.heroSession.id);
  }

  public get elementsModule(): ElementsModule {
    return ElementsModule.bySessionId.get(this.heroSession.id);
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

    await this.timetravelPlayer.showLoadStatus(this.timelineBuilder.lastMetadata);
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
  }

  public sendDomRecordingUpdates(tab: Tab, events: Tab['EventTypes']['page-events']): void {
    if (!events.records.domChanges?.length) return;
    const timestamp = this.lastDomChangesByTabId[tab.id];
    const domRecording = tab.mirrorPage.getDomRecordingSince(timestamp);

    this.lastDomChangesByTabId[tab.id] =
      domRecording.paintEvents[domRecording.paintEvents.length - 1].timestamp;

    ChromeAliveCore.sendAppEvent('Dom.updated', {
      paintEvents: domRecording.paintEvents.map(x => x.changeEvents),
      framesById: tab.session.db.frames.framesById,
    });
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
