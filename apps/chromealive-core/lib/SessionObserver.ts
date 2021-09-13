import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { Session as DataboxSession } from '@ulixee/databox-core';
import type { IFrameNavigationEvents } from '@ulixee/hero-core/lib/FrameNavigations';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import { IScriptInstanceMeta } from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { IHeroSessionActiveEvent } from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import { OutputRebuilder, IOutputSnapshot } from '@ulixee/databox-core/lib/OutputRebuilder';
import type { IOutputChangeRecord } from '@ulixee/databox-core/models/OutputTable';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import { ContentPaint } from '@ulixee/hero-interfaces/INavigation';
import { IDataboxUpdatedEvent } from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';

export class SessionObserver extends TypedEventEmitter<{
  'hero:updated': void;
  'databox:updated': void;
  closed: void;
}> {
  public loadedUrls: ISessionUrl[] = [];
  public playState: IHeroSessionActiveEvent['state'] = 'play';

  private scriptLastModifiedTime: number;
  private readonly scriptInstanceMeta: IScriptInstanceMeta;
  private databoxSession: DataboxSession;
  private outputRebuilder = new OutputRebuilder(false);
  private databoxInput: any = null;
  private databoxInputBytes = 0;

  constructor(public readonly heroSession: HeroSession) {
    super();
    bindFunctions(this);
    this.scriptInstanceMeta = heroSession.options.scriptInstanceMeta;
    this.heroSession.on('tab-created', this.onTabCreated);
    this.heroSession.on('kept-alive', this.onHeroSessionKeptAlive);
    this.heroSession.on('resumed', this.onHeroSessionResumed);
    this.heroSession.on('closing', this.close);
    this.heroSession.once('closed', () => this.emit('closed'));
    this.scriptLastModifiedTime = Fs.statSync(this.scriptInstanceMeta.entrypoint).mtimeMs;
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

  public close(): void {
    Fs.unwatchFile(this.scriptInstanceMeta.entrypoint, this.onFileUpdated);
    this.heroSession.off('tab-created', this.onTabCreated);
  }

  public toEvent(): IHeroSessionActiveEvent {
    const runCommands = this.heroSession.sessionState.commands.filter(
      x => x.run === this.heroSession.resumeCounter,
    );
    const thisRunUrls = new Set<string>();
    for (const command of runCommands) {
      thisRunUrls.add(command.url);
      if (command.result?.url) thisRunUrls.add(command.result.url);
    }
    const runStart = runCommands[0]?.runStartDate;

    const loadedUrls = this.loadedUrls.filter(
      x => thisRunUrls.has(x.url) || x.timestamp >= runStart,
    );

    let startDate = Date.now();
    let endDate = startDate;
    if (loadedUrls.length) {
      startDate = loadedUrls[0].timestamp;
      endDate = loadedUrls[loadedUrls.length - 1].timestamp;
    }

    const activeTab = this.heroSession.getLastActiveTab();
    if (activeTab) {
      endDate += 1e3;
      loadedUrls.push({
        tabId: activeTab.id,
        url: activeTab.url,
        timestamp: endDate,
        navigationId: null,
      } as any);
    }

    const millis = Math.max(endDate - startDate, 1);

    return {
      hasWarning: false,
      run: this.heroSession.resumeCounter,
      scriptEntrypoint: this.scriptInstanceMeta.entrypoint,
      scriptLastModifiedTime: this.scriptLastModifiedTime,
      heroSessionId: this.heroSession.id,
      durationSeconds: Math.floor((endDate - startDate) / 1e3),
      state: this.playState,
      loadedUrls: loadedUrls.map(x => {
        return {
          tabId: x.tabId,
          url: x.url,
          navigationId: x.navigationId,
          hasScreenshot: !!x.screenshotBase64,
          offsetPercent: round((100 * (x.timestamp - startDate)) / millis),
        };
      }),
    };
  }

  public getDataboxEvent(): IDataboxUpdatedEvent {
    const output: IOutputSnapshot = this.outputRebuilder.getLatestSnapshot() ?? {
      bytes: 0,
      output: null,
      changes: [],
    };
    return {
      ...output,
      input: this.databoxInput,
    };
  }

  private onFileUpdated(stats: Fs.Stats): void {
    this.scriptLastModifiedTime = stats.mtimeMs;
    this.emit('hero:updated');
  }

  private onHeroSessionResumed(): void {
    this.playState = 'play';
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

  private onHeroSessionKeptAlive(event: { message: string }): void {
    this.playState = 'paused';
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private onTabCreated(tabEvent: { tab: Tab }) {
    const tab = tabEvent.tab;
    tab.navigations.on('status-change', status => this.onStatusChange(status, tab));
  }

  private async onStatusChange(
    status: IFrameNavigationEvents['status-change'],
    tab: Tab,
  ): Promise<void> {
    let sessionUrl = this.loadedUrls.find(x => x.navigationId === status.id);

    if (
      !sessionUrl &&
      [LoadStatus.DomContentLoaded, LoadStatus.AllContentLoaded, ContentPaint].includes(
        status.newStatus,
      )
    ) {
      sessionUrl = <ISessionUrl>{
        navigationId: status.id,
        timestamp: status.statusChanges[status.newStatus] ?? Date.now(),
        url: status.url,
        tabId: tab.id,
        commandId: tab.lastCommandId,
      };
      this.loadedUrls.push(sessionUrl);
    }

    if (!sessionUrl) return;

    // update url in case it changed
    sessionUrl.url = status.url;

    if (status.newStatus === 'ContentPaint' || !sessionUrl.pendingScreenshot) {
      try {
        sessionUrl.pendingScreenshot = tab.puppetPage.screenshot('jpeg', undefined, 50);
        sessionUrl.screenshotBase64 = (await sessionUrl.pendingScreenshot).toString('base64');
      } catch (err) {
        // don't do anything
      }
    }
    this.emit('hero:updated');
  }
}

function round(num: number): number {
  return Math.floor(1000 * num) / 1000;
}

export interface ISessionUrl {
  tabId: number;
  screenshotBase64: string;
  pendingScreenshot: Promise<Buffer>;
  url: string;
  commandId: number;
  navigationId: number;
  timestamp: number;
}
