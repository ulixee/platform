import { Session, Tab } from '@ulixee/hero-core';
import type { IFrameNavigationEvents } from '@ulixee/hero-core/lib/FrameNavigations';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import ISessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/ISessionActiveEvent';

export default class SessionObserver extends TypedEventEmitter<{
  'session:updated': void;
}> {
  public ticks: ISessionTick[] = [];
  public playState: ISessionActiveEvent['state'] = 'play';

  private scriptLastModifiedTime: number;
  private readonly scriptInstanceMeta: IScriptInstanceMeta;

  constructor(public readonly session: Session) {
    super();
    bindFunctions(this);
    this.scriptInstanceMeta = session.options.scriptInstanceMeta;
    this.session.on('tab-created', this.onTabCreated);
    this.session.on('kept-alive', this.onSessionKeptAlive);
    this.session.on('resumed', this.onSessionResumed);
    this.session.on('closing', () => session.off('tab-created', this.onTabCreated));
    this.scriptLastModifiedTime = Fs.statSync(this.scriptInstanceMeta.entrypoint).mtimeMs;
    Fs.watchFile(
      this.scriptInstanceMeta.entrypoint,
      {
        persistent: false,
        interval: 2e3,
      },
      this.onFileUpdated,
    );
  }

  public close(): void {
    Fs.unwatchFile(this.scriptInstanceMeta.entrypoint, this.onFileUpdated);
    this.session.off('tab-created', this.onTabCreated);
  }

  public toEvent(): ISessionActiveEvent {
    const runCommands = this.session.sessionState.commands.filter(
      x => x.run === this.session.resumeCounter,
    );
    const thisRunUrls = new Set<string>(runCommands.map(x => x.url));
    const runStart = runCommands[0]?.runStartDate;

    const ticks = this.ticks.filter(x => thisRunUrls.has(x.url) && x.timestamp >= runStart);

    let startDate = Date.now();
    let endDate = startDate;
    if (ticks.length) {
      startDate = ticks[0].timestamp;
      endDate = ticks[ticks.length - 1].timestamp;
    }

    const activeTab = this.session.getLastActiveTab();
    if (activeTab) {
      endDate += 1e3;
      ticks.push({
        tabId: activeTab.id,
        url: activeTab.url,
        timestamp: endDate,
        navigationId: null,
      } as any);
    }

    const millis = Math.max(endDate - startDate, 1);

    return {
      hasWarning: false,
      inputKb: 0,
      outputKb: 0,
      run: this.session.resumeCounter,
      scriptEntrypoint: this.scriptInstanceMeta.entrypoint,
      scriptLastModifiedTime: this.scriptLastModifiedTime,
      sessionId: this.session.id,
      durationSeconds: Math.floor((endDate - startDate) / 1e3),
      state: this.playState,
      ticks: ticks.map(x => {
        return {
          tabId: x.tabId,
          url: x.url,
          navigationId: x.navigationId,
          screenshotUrl: x.screenshotBase64
            ? `/session/${this.session.id}/ticks/${x.navigationId}/screenshot.jpeg`
            : null,
          offsetPercent: round((100 * (x.timestamp - startDate)) / millis),
        };
      }),
    };
  }

  private onFileUpdated(stats: Fs.Stats): void {
    this.scriptLastModifiedTime = stats.mtimeMs;
    this.emit('session:updated');
  }

  private onSessionResumed(): void {
    this.playState = 'play';
  }

  private onSessionKeptAlive(): void {
    this.playState = 'paused';
  }

  private onTabCreated(tabEvent: { tab: Tab }) {
    const tab = tabEvent.tab;
    tab.navigations.on('status-change', status => this.onStatusChange(status, tab));
  }

  private async onStatusChange(
    status: IFrameNavigationEvents['status-change'],
    tab: Tab,
  ): Promise<void> {
    let tick = this.ticks.find(x => x.navigationId === status.id);

    if (!tick && ['DomContentLoaded', 'Load', 'ContentPaint'].includes(status.newStatus)) {
      tick = <ISessionTick>{
        navigationId: status.id,
        timestamp: status.stateChanges[status.newStatus].getTime(),
        url: status.url,
        tabId: tab.id,
        commandId: tab.lastCommandId,
      };
      this.ticks.push(tick);
    }

    if (!tick) return;

    // update url in case it changed
    tick.url = status.url;

    if (status.newStatus === 'ContentPaint') {
      try {
        const screenshot = await tab.puppetPage.screenshot('jpeg', undefined, 50);
        tick.screenshotBase64 = screenshot.toString('base64');
      } catch (err) {
        // don't do anything
      }
    }
    this.emit('session:updated');
  }
}

function round(num: number): number {
  return Math.floor(1000 * num) / 1000;
}

export interface ISessionTick {
  tabId: number;
  screenshotBase64: string;
  url: string;
  commandId: number;
  navigationId: number;
  timestamp: number;
}
