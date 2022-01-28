import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import type { IOutputChangeRecord } from '@ulixee/hero-core/models/OutputTable';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import IAppModeEvent from '@ulixee/apps-chromealive-interfaces/events/IAppModeEvent';
import * as Path from 'path';
import { fork } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import { ITabEventParams } from '@ulixee/hero-core/lib/Tab';
import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
import DomStateManager from './DomStateManager';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import ChromeAliveCore from '../index';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';
import AliveBarPositioner from './AliveBarPositioner';
import OutputRebuilder, { IOutputSnapshot } from './OutputRebuilder';

const { log } = Log(module);

export default class SessionObserver extends TypedEventEmitter<{
  'hero:updated': void;
  'databox:updated': void;
  'app:mode': void;
  closed: void;
}> {
  public mode: IAppModeEvent['mode'] = 'live';
  public playbackState: IHeroSessionActiveEvent['playbackState'] = 'running';
  public readonly domStateManager: DomStateManager;
  public readonly timelineBuilder: TimelineBuilder;

  public readonly timetravelPlayer: TimetravelPlayer;
  public readonly timelineRecorder: TimelineRecorder;
  public readonly scriptInstanceMeta: IScriptInstanceMeta;
  public readonly worldHeroSessionIds = new Set<string>();

  private waitForDomStateEvents: {
    id: string;
    startingCommandId: number;
    timestamp: number;
    didMatch?: boolean;
    inProgress: boolean;
  }[] = [];

  private sessionHasChangesRequiringRestart = false;

  private scriptLastModifiedTime: number;
  private outputRebuilder = new OutputRebuilder();
  private hasScriptUpdatesSinceLastRun = false;
  private watchHandle: Fs.FSWatcher;

  constructor(public readonly heroSession: HeroSession) {
    super();
    bindFunctions(this);
    this.logger = log.createChild(module, { sessionId: heroSession.id });
    this.scriptInstanceMeta = heroSession.options.scriptInstanceMeta;
    this.worldHeroSessionIds.add(heroSession.id);

    this.heroSession.on('tab-created', this.onTabCreated);
    this.heroSession.on('kept-alive', this.onHeroSessionKeptAlive);
    this.heroSession.on('resumed', this.onHeroSessionResumed);
    this.heroSession.on('closing', this.close);

    this.timelineBuilder = new TimelineBuilder({ liveSession: heroSession });

    this.timelineRecorder = new TimelineRecorder(heroSession);
    this.timelineRecorder.on('updated', () => this.emit('hero:updated'));

    this.timetravelPlayer = TimetravelPlayer.create(heroSession.id, heroSession);
    this.timetravelPlayer.on('all-tabs-closed', this.onTimetravelClosed);
    this.timetravelPlayer.on('open', this.onTimetravelOpened);
    this.timetravelPlayer.on('new-tick-command', () => this.emit('databox:updated'));

    this.scriptLastModifiedTime = Fs.statSync(this.scriptInstanceMeta.entrypoint).mtimeMs;

    this.domStateManager = new DomStateManager(this);
    this.domStateManager.on('imported', this.onDomStateImported.bind(this));
    this.domStateManager.on('enter', () => {
      this.mode = 'domstate';
      this.emit('app:mode');
    });
    this.domStateManager.on('exit', () => {
      this.mode = 'live';
      this.emit('app:mode');
    });
    this.bindOutput();
    this.watchHandle = Fs.watch(
      this.scriptInstanceMeta.entrypoint,
      {
        persistent: false,
      },
      this.onScriptEntrypointUpdated,
    );
  }

  public getScreenshot(heroSessionId: string, tabId: number, timestamp: number): string {
    if (heroSessionId === this.heroSession.id) {
      return this.timelineBuilder.getScreenshot(tabId, timestamp);
    }
    return this.domStateManager.getScreenshot(heroSessionId, tabId, timestamp);
  }

  public onMultiverseSession(session: HeroSession): void {
    this.domStateManager.onMultiverseSession(session);
    this.worldHeroSessionIds.add(session.id);
    this.emit('hero:updated');
  }

  public async relaunchSession(
    startLocation: ISessionCreateOptions['sessionResume']['startLocation'],
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
          this.relaunchSession('sessionStart').catch(() => null);
        }
      });
    } catch (error) {
      this.logger.error('ERROR resuming session', { error });
      return error;
    }
  }

  public close(): void {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
    this.heroSession.off('tab-created', this.onTabCreated);
    this.heroSession.off('kept-alive', this.onHeroSessionKeptAlive);
    this.heroSession.off('resumed', this.onHeroSessionResumed);
    this.heroSession.off('closing', this.close);
    this.timelineRecorder.stop();
    this.timetravelPlayer?.close()?.catch(console.error);
    this.domStateManager.close(true).catch(console.error);
    this.domStateManager.removeAllListeners('updated');
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
    const domStates: IHeroSessionActiveEvent['domStates'] = [];
    const timeline = this.timelineBuilder.refreshMetadata();
    const commandTimeline = this.timelineBuilder.commandTimeline;

    for (const state of this.waitForDomStateEvents) {
      const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(state.timestamp);
      if (offsetPercent === -1) continue;

      domStates.push({
        id: state.id,
        name: this.domStateManager.getDomState(state.id)?.name,
        offsetPercent,
        didMatch: state.didMatch,
        inProgress: state.inProgress,
      });
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
      mode: this.mode,
      playbackState: this.playbackState,
      worldHeroSessionIds: [...this.worldHeroSessionIds],
      ...this.getScriptDetails(),
      domStates,
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
    this.mode = 'timetravel';
    this.tabGroupModule.once('tab-group-opened', this.closeTimetravel);
    await this.updateTabGroup(true).catch(console.error);
    this.timetravelPlayer.once('timetravel-to-end', this.closeTimetravel);
    this.emit('app:mode');
  }

  private async onTimetravelClosed(): Promise<void> {
    this.mode = 'live';
    this.tabGroupModule?.off('tab-group-opened', this.closeTimetravel);
    this.timetravelPlayer.off('timetravel-to-end', this.closeTimetravel);
    await this.updateTabGroup(false).catch(console.error);
    this.emit('app:mode');
  }

  private isLivePage(pageId: string): boolean {
    for (const tab of this.heroSession.tabsById.values()) {
      if (tab.puppetPage.id === pageId) return true;
    }
    return false;
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
    this.bindOutput();
    this.hasScriptUpdatesSinceLastRun = false;
    this.emit('hero:updated');
    this.emit('databox:updated');
  }

  private onHeroSessionKeptAlive(event: { message: string }): void {
    this.playbackState = 'paused';
    this.emit('hero:updated');
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private bindOutput(): void {
    this.heroSession?.off('output', this.onOutputUpdated);
    this.outputRebuilder = new OutputRebuilder();
    this.heroSession.on('output', this.onOutputUpdated);
  }

  private onOutputUpdated(event: { changes: IOutputChangeRecord[] }): void {
    this.outputRebuilder.applyChanges(event.changes);
    this.emit('databox:updated');
  }

  private onDomStateImported(event: { heroSessionIds: string[] }) {
    for (const id of event.heroSessionIds) this.worldHeroSessionIds.add(id);
    this.emit('hero:updated');
  }

  private onTabCreated(tabEvent: { tab: Tab }) {
    const tab = tabEvent.tab;
    tab.on('wait-for-domstate', this.onWaitForDomState);
  }

  private onWaitForDomState(event: ITabEventParams['wait-for-domstate']): void {
    const { listener } = event;
    const id = listener.id;
    const startingCommandId = listener.startingCommandId;
    const timestamp = listener.commandStartTime;
    const domState = { id, startingCommandId, timestamp, didMatch: null, inProgress: true };

    const existing = this.waitForDomStateEvents.find(x => x.id === id);
    if (existing) {
      existing.timestamp = timestamp;
      existing.startingCommandId = startingCommandId;
    } else {
      this.waitForDomStateEvents.push(domState);
    }
    this.emit('hero:updated');
    listener.once('resolved', state => {
      domState.didMatch = state.didMatch;
      domState.inProgress = false;
      this.emit('hero:updated');
    });
  }
}
