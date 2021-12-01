import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { Session as DataboxSession } from '@ulixee/databox-core';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import OutputRebuilder, { IOutputSnapshot } from '@ulixee/databox-core/lib/OutputRebuilder';
import type { IOutputChangeRecord } from '@ulixee/databox-core/models/OutputTable';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import * as Path from 'path';
import { fork } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import { ITabEventParams } from '@ulixee/hero-core/lib/Tab';
import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
import PageStateManager from './PageStateManager';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import ChromeAliveCore from '../index';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';
import AliveBarPositioner from './AliveBarPositioner';

const { log } = Log(module);

export default class SessionObserver extends TypedEventEmitter<{
  'hero:updated': void;
  'databox:updated': void;
  closed: void;
  'app:mode': string;
}> {
  public playbackState: IHeroSessionActiveEvent['playbackState'] = 'live';
  public readonly pageStateManager: PageStateManager;
  public readonly timelineBuilder: TimelineBuilder;

  public readonly timetravelPlayer: TimetravelPlayer;
  public readonly timelineRecorder: TimelineRecorder;
  public readonly scriptInstanceMeta: IScriptInstanceMeta;

  private waitForPageStateEvents: {
    id: string;
    startingCommandId: number;
    timestamp: number;
    isUnresolved: boolean;
    resolvedState: string;
  }[] = [];

  private scriptLastModifiedTime: number;
  private databoxSession: DataboxSession;
  private outputRebuilder = new OutputRebuilder();
  private databoxInput: any = null;
  private databoxInputBytes = 0;
  private hasScriptUpdatesSinceLastRun = false;

  constructor(public readonly heroSession: HeroSession) {
    super();
    bindFunctions(this);
    this.logger = log.createChild(module, { sessionId: heroSession.id });
    this.scriptInstanceMeta = heroSession.options.scriptInstanceMeta;

    this.heroSession.on('tab-created', this.onTabCreated);
    this.heroSession.on('kept-alive', this.onHeroSessionKeptAlive);
    this.heroSession.on('resumed', this.onHeroSessionResumed);
    this.heroSession.on('closing', this.close);
    this.heroSession.once('closed', () => this.emit('closed'));

    this.timelineBuilder = new TimelineBuilder({ liveSession: heroSession });

    this.timelineRecorder = new TimelineRecorder(heroSession);
    this.timelineRecorder.on('updated', () => this.emit('hero:updated'));

    this.timetravelPlayer = TimetravelPlayer.create(heroSession.id, heroSession);
    this.timetravelPlayer.on('all-tabs-closed', this.onTimetravelClosed);
    this.timetravelPlayer.on('open', this.onTimetravelOpened);
    this.timetravelPlayer.on('new-tick-command', () => this.emit('databox:updated'));

    this.scriptLastModifiedTime = Fs.statSync(this.scriptInstanceMeta.entrypoint).mtimeMs;

    this.pageStateManager = new PageStateManager(this);
    this.pageStateManager.on('enter', () =>
      ChromeAliveCore.sendAppEvent('App.mode', 'pagestate-generator'),
    );
    this.pageStateManager.on('exit', () => ChromeAliveCore.sendAppEvent('App.mode', 'live'));
    this.bindDatabox();
    Fs.watchFile(
      this.scriptInstanceMeta.entrypoint,
      {
        persistent: false,
        interval: 2e3,
      },
      this.onFileUpdated,
    );
  }

  public getScreenshot(heroSessionId: string, tabId: number, timestamp: number): string {
    if (heroSessionId === this.heroSession.id) {
      return this.timelineBuilder.getScreenshot(tabId, timestamp);
    }
    return this.pageStateManager.getScreenshot(heroSessionId, tabId, timestamp);
  }

  public onMultiverseSession(session: HeroSession): void {
    this.pageStateManager.onMultiverseSession(session);
  }

  public relaunchSession(
    startLocation: ISessionCreateOptions['sessionResume']['startLocation'],
    startNavigationId?: number,
  ): Error | undefined {
    if (startLocation === 'sessionStart') {
      ChromeAliveCore.restartingHeroSessionId = this.heroSession.id;
      AliveBarPositioner.restartingSession(this.heroSession.id);
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
    if (script.endsWith('.ts')) {
      execArgv.push('-r', 'ts-node/register');
    }

    try {
      this.logger.info('Resuming session', { execArgv });
      const child = fork(script, execArgv, {
        // execArgv,
        cwd: this.scriptInstanceMeta.workingDirectory,
        stdio: ['ignore', 'inherit', 'pipe', 'ipc'],
        env: { ...process.env, HERO_CLI_NOPROMPT: 'true' },
      });
      child.stderr.setEncoding('utf-8');
      child.stderr.on('data', x => {
        if (x.includes('ScriptChangedNeedsRestartError')) {
          this.relaunchSession('sessionStart');
        }
      });
    } catch (error) {
      this.logger.error('ERROR resuming session', { error });
      return error;
    }
  }

  public close(): void {
    Fs.unwatchFile(this.scriptInstanceMeta.entrypoint, this.onFileUpdated);
    this.heroSession.off('tab-created', this.onTabCreated);
    this.heroSession.off('kept-alive', this.onHeroSessionKeptAlive);
    this.heroSession.off('resumed', this.onHeroSessionResumed);
    this.heroSession.off('closing', this.close);
    this.timelineRecorder.stop();
    this.timetravelPlayer?.close();
    this.pageStateManager.close(true).catch(console.error);
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
    const pageStates: IHeroSessionActiveEvent['pageStates'] = [];
    const timeline = this.timelineBuilder.refreshMetadata();
    const commandTimeline = this.timelineBuilder.commandTimeline;

    let pageStateIdNeedsResolution: string = null;
    for (const state of this.waitForPageStateEvents) {
      const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(state.timestamp);
      if (offsetPercent === -1) continue;

      pageStates.push({
        id: state.id,
        offsetPercent,
        isUnresolved: state.isUnresolved,
        resolvedState: state.resolvedState,
      });
    }
    const lastPageState = pageStates[pageStates.length - 1];
    if (lastPageState) {
      if (lastPageState.isUnresolved === true) {
        if (!this.hasScriptUpdatesSinceLastRun) {
          pageStateIdNeedsResolution = lastPageState.id;
        }
        lastPageState.offsetPercent = 100;
      }
    }

    const currentTab = this.heroSession.getLastActiveTab();

    timeline.urls.push({
      url: currentTab?.url,
      tabId: currentTab?.id,
      navigationId: null, // don't include nav id since we want to resume session at current
      offsetPercent: 100,
      loadStatusOffsets: [],
    });

    return {
      hasWarning: false,
      run: this.heroSession.commands.resumeCounter,
      heroSessionId: this.heroSession.id,
      runtimeMs: commandTimeline.runtimeMs,
      playbackState: this.playbackState,
      ...this.getScriptDetails(),
      pageStateIdNeedsResolution,
      pageStates,
      timeline,
    };
  }

  public getDataboxEvent(): IDataboxUpdatedEvent {
    const commandId = this.timetravelPlayer.activeCommandId;

    const output: IOutputSnapshot = this.outputRebuilder.getLatestSnapshot(commandId) ?? {
      bytes: 0,
      output: null,
      changes: [],
    };
    return {
      ...output,
      input: this.databoxInput,
    };
  }

  public get tabGroupModule(): TabGroupModule {
    return TabGroupModule.bySessionId.get(this.heroSession.id);
  }

  public async groupTabs(name: string, color: string, collapse: boolean): Promise<number> {
    const tabGroupModule = this.tabGroupModule;
    if (!tabGroupModule) return;

    const pages = [...this.heroSession.tabsById.values()].map(x => x.puppetPage);
    if (!pages.length) return;
    return await tabGroupModule.groupTabs(pages, name, color, collapse);
  }

  public async updateTabGroup(groupLive: boolean): Promise<void> {
    const tabGroupModule = this.tabGroupModule;
    if (!tabGroupModule) return;

    const pages = [...this.heroSession.tabsById.values()].map(x => x.puppetPage);
    if (!pages.length) return;

    if (groupLive === false) {
      await tabGroupModule.ungroupTabs(pages);
    } else {
      await this.groupTabs('Reopen Live', 'blue', true);
    }
  }

  public async didFocusOnPage(pageId: string, didFocus: boolean): Promise<void> {
    const isLiveTab = this.isLivePage(pageId);
    const isTimetravelTab = this.timetravelPlayer.isOwnPage(pageId) ?? false;

    // if closing time travel tab, leave
    if (isTimetravelTab && !didFocus) return;

    const didFocusOnLiveTab = isLiveTab && didFocus;
    // if time travel is opened and we focused on a live page, close it
    if (didFocusOnLiveTab && this.timetravelPlayer.isOpen) {
      await this.closeTimetravel();
    }
  }

  public async closeTimetravel(): Promise<void> {
    await this.timetravelPlayer.close();
  }

  public async onTimetravelOpened(): Promise<void> {
    this.playbackState = 'timetravel';
    this.tabGroupModule.once('tab-group-opened', this.closeTimetravel);
    await this.updateTabGroup(true).catch(console.error);
    this.timetravelPlayer.once('timetravel-to-end', this.closeTimetravel);
    this.emit('hero:updated');
  }

  private async onTimetravelClosed(): Promise<void> {
    this.playbackState = 'paused';
    this.tabGroupModule.off('tab-group-opened', this.closeTimetravel);
    this.timetravelPlayer.off('timetravel-to-end', this.closeTimetravel);
    await this.updateTabGroup(false).catch(console.error);
    this.emit('hero:updated');
  }

  private isLivePage(pageId: string): boolean {
    for (const tab of this.heroSession.tabsById.values()) {
      if (tab.puppetPage.id === pageId) return true;
    }
    return false;
  }

  private onFileUpdated(stats: Fs.Stats): void {
    this.scriptLastModifiedTime = stats.mtimeMs;
    this.hasScriptUpdatesSinceLastRun = true;
    this.emit('hero:updated');
  }

  private onHeroSessionResumed(): void {
    this.playbackState = 'live';
    this.bindDatabox();
    this.hasScriptUpdatesSinceLastRun = false;
    this.emit('hero:updated');
    this.emit('databox:updated');
  }

  private onHeroSessionKeptAlive(event: { message: string }): void {
    if (this.playbackState === 'live') this.playbackState = 'paused';
    this.emit('hero:updated');
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private bindDatabox(): void {
    this.databoxSession?.off('output', this.onOutputUpdated);

    const databoxSessionId = this.heroSession.options.externalIds?.databoxSessionId as string;
    this.databoxSession = DataboxSession.get(databoxSessionId);

    if (this.databoxSession) {
      this.databoxInput = this.databoxSession.options.input;
      this.databoxInputBytes = this.databoxInput
        ? Buffer.byteLength(JSON.stringify(this.databoxInput))
        : 0;

      this.outputRebuilder = new OutputRebuilder();
      this.databoxSession.on('output', this.onOutputUpdated);
    }
  }

  private onOutputUpdated(event: { changes: IOutputChangeRecord[] }): void {
    this.outputRebuilder.applyChanges(event.changes);
    this.emit('databox:updated');
  }

  private onTabCreated(tabEvent: { tab: Tab }) {
    const tab = tabEvent.tab;
    tab.on('wait-for-pagestate', this.onWaitForPageState);
  }

  private onWaitForPageState(event: ITabEventParams['wait-for-pagestate']): void {
    const { listener } = event;
    const id = listener.id;
    const startingCommandId = listener.startingCommandId;
    const timestamp = listener.commandStartTime;
    const pageState = { id, startingCommandId, timestamp, isUnresolved: null, resolvedState: null };

    const existing = this.waitForPageStateEvents.find(x => x.id === id);
    if (existing) {
      existing.isUnresolved = null;
      existing.resolvedState = null;
      existing.timestamp = timestamp;
      existing.startingCommandId = startingCommandId;
    } else {
      this.waitForPageStateEvents.push(pageState);
    }
    this.emit('hero:updated');
    listener.on('resolved', state => {
      pageState.isUnresolved = !state.state;
      pageState.resolvedState = state.state;
      this.emit('hero:updated');
    });
  }
}
