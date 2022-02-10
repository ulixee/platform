import { Session as HeroSession } from '@ulixee/hero-core';
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
import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import ChromeAliveCore from '../index';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';
import AliveBarPositioner from './AliveBarPositioner';
import OutputRebuilder, { IOutputSnapshot } from './OutputRebuilder';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import SourceCodeTimeline from './SourceCodeTimeline';

const { log } = Log(module);

export default class SessionObserver extends TypedEventEmitter<{
  'hero:updated': void;
  'databox:updated': void;
  'app:mode': void;
  closed: void;
}> {
  public mode: IAppModeEvent['mode'] = 'live';
  public playbackState: IHeroSessionActiveEvent['playbackState'] = 'running';
  public readonly timelineBuilder: TimelineBuilder;

  public readonly timetravelPlayer: TimetravelPlayer;
  public readonly timelineRecorder: TimelineRecorder;
  public readonly scriptInstanceMeta: IScriptInstanceMeta;
  public readonly worldHeroSessionIds = new Set<string>();
  public readonly sourceCodeTimeline: SourceCodeTimeline;

  private sessionHasChangesRequiringRestart = false;

  private scriptLastModifiedTime: number;
  private outputRebuilder = new OutputRebuilder();
  private hasScriptUpdatesSinceLastRun = false;
  private watchHandle: Fs.FSWatcher;
  private eventSubscriber = new EventSubscriber();

  constructor(public readonly heroSession: HeroSession) {
    super();
    bindFunctions(this);
    this.logger = log.createChild(module, { sessionId: heroSession.id });
    this.scriptInstanceMeta = heroSession.options.scriptInstanceMeta;
    this.worldHeroSessionIds.add(heroSession.id);

    this.eventSubscriber.on(this.heroSession, 'kept-alive', this.onHeroSessionKeptAlive);
    this.eventSubscriber.on(this.heroSession, 'resumed', this.onHeroSessionResumed);
    this.eventSubscriber.on(this.heroSession, 'closing', this.close);
    this.eventSubscriber.on(this.heroSession, 'output', this.onOutputUpdated);

    this.timelineBuilder = new TimelineBuilder({ liveSession: heroSession });

    this.timelineRecorder = new TimelineRecorder(heroSession);
    this.eventSubscriber.on(this.timelineRecorder, 'updated', () => this.emit('hero:updated'));

    this.timetravelPlayer = TimetravelPlayer.create(heroSession.id, heroSession);
    this.eventSubscriber.on(this.timetravelPlayer, 'all-tabs-closed', this.onTimetravelClosed);
    this.eventSubscriber.on(this.timetravelPlayer, 'open', this.onTimetravelOpened);

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
      const evt = this.eventSubscriber.on(child.stderr, 'data', x => {
        if (x.includes('ScriptChangedNeedsRestartError')) {
          this.relaunchSession('sessionStart').catch(() => null);
        }
      });
      this.eventSubscriber.once(child, 'exit', () => this.eventSubscriber.off(evt));
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
    this.sourceCodeTimeline.close();

    this.eventSubscriber.close();
    this.timelineRecorder.stop();
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
    const domStates: IHeroSessionActiveEvent['domStates'] = [];
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

  public async timetravel(
    percentOffset: number,
    step?: 'forward' | 'back',
  ): Promise<{ timelineOffsetPercent: number }> {
    // set to timetravel mode in advance to prevent jumping out
    this.mode = 'timetravel';

    if (!this.timetravelPlayer.isOpen) {
      await this.updateTabGroup(true).catch(console.error);
    }
    if (step) {
      await this.timetravelPlayer.step(step);
    } else {
      await this.timetravelPlayer.goto(percentOffset ?? 100);
    }

    await this.timetravelPlayer.showLoadStatus(this.timelineBuilder.lastMetadata);
    return { timelineOffsetPercent: this.timetravelPlayer.activeTab.currentTimelineOffsetPct };
  }

  public async closeTimetravel(): Promise<void> {
    await this.timetravelPlayer.close();
  }

  public async onTimetravelOpened(): Promise<void> {
    this.mode = 'timetravel';
    const events = [
      this.eventSubscriber.once(this.tabGroupModule, 'tab-group-opened', this.closeTimetravel),
      this.eventSubscriber.once(this.timetravelPlayer, 'timetravel-to-end', this.closeTimetravel),
    ];
    this.eventSubscriber.group('timetravel', ...events);
    await this.timetravelPlayer.activeTab.mirrorPage.page.bringToFront();
    this.emit('app:mode');
  }

  private async onTimetravelClosed(): Promise<void> {
    this.mode = 'live';
    this.eventSubscriber.endGroup('timetravel');
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
    this.outputRebuilder = new OutputRebuilder();
    this.sourceCodeTimeline.clearCache()
    this.hasScriptUpdatesSinceLastRun = false;
    this.emit('hero:updated');
    this.emit('databox:updated');
  }

  private onHeroSessionKeptAlive(event: { message: string }): void {
    this.playbackState = 'paused';
    this.emit('hero:updated');
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private onOutputUpdated(event: { changes: IOutputChangeRecord[] }): void {
    this.outputRebuilder.applyChanges(event.changes);
    this.emit('databox:updated');
  }
}
