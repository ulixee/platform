import Core, { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { Session as DataboxSession } from '@ulixee/databox-core';
import type { IFrameNavigationEvents } from '@ulixee/hero-core/lib/FrameNavigations';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import IHeroSessionActiveEvent from '@ulixee/apps-chromealive-interfaces/events/IHeroSessionActiveEvent';
import OutputRebuilder, { IOutputSnapshot } from '@ulixee/databox-core/lib/OutputRebuilder';
import type { IOutputChangeRecord } from '@ulixee/databox-core/models/OutputTable';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import { ContentPaint } from '@ulixee/hero-interfaces/INavigation';
import IDataboxUpdatedEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxUpdatedEvent';
import * as Path from 'path';
import CommandTimeline from '@ulixee/hero-core/lib/CommandTimeline';
import { IDomChangeRecord } from '@ulixee/hero-core/models/DomChangesTable';
import HeroSessionReplay from '@ulixee/hero-core/lib/SessionReplay';
import DirectConnectionToCoreApi from '@ulixee/hero-core/connections/DirectConnectionToCoreApi';
import { PluginTypes } from '@ulixee/hero-interfaces/IPluginTypes';
import TabGroupCorePlugin from '../hero-plugins/TabGroupCorePlugin';

export default class SessionObserver extends TypedEventEmitter<{
  'hero:updated': void;
  'databox:updated': void;
  closed: void;
}> {
  public loadedNavigationIds = new Set<number>();
  public playbackState: IHeroSessionActiveEvent['playbackState'] = 'live';
  public screenshotsByTimestamp = new Map<
    number,
    { timestamp: number; imageBase64: string; tabId: number }
  >();

  private domChangesByTimestamp = new Map<number, number>();
  private replay: HeroSessionReplay;

  private scriptLastModifiedTime: number;
  private readonly scriptInstanceMeta: IScriptInstanceMeta;
  private databoxSession: DataboxSession;
  private outputRebuilder = new OutputRebuilder();
  private databoxInput: any = null;
  private databoxInputBytes = 0;
  private lastHeroSessionActiveEvent: IHeroSessionActiveEvent;

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

    const corePlugins = heroSession.plugins.instances.filter(x => {
      // only use core plugins - no emulators
      if (x.id === 'default-human-emulator' || x.id === 'default-browser-emulator') return false;
      return Core.pluginMap.corePluginsById[x.id].type === PluginTypes.CorePlugin;
    });
    const connectionToCoreApi = new DirectConnectionToCoreApi();
    this.replay = new HeroSessionReplay(heroSession.id, connectionToCoreApi, corePlugins);
    this.replay.on('all-tabs-closed', this.onReplayClosed.bind(this));
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

  public getHeroSessionEvent(): IHeroSessionActiveEvent {
    const runId = this.heroSession.resumeCounter;

    const navigations = this.heroSession.sessionState.allNavigations;

    const commandTimeline = new CommandTimeline(
      this.heroSession.sessionState.commands,
      runId,
      navigations,
    );

    const urls: IHeroSessionActiveEvent['urls'] = [];

    const loadStatusLookups = [
      [LoadStatus.HttpRequested, 'Http Requested'],
      [LoadStatus.HttpResponded, 'Http Received'],
      [LoadStatus.DomContentLoaded, 'DOM Content Loaded'],
    ];

    for (const nav of commandTimeline.navigationsById.values()) {
      if (!this.loadedNavigationIds.has(nav.id)) continue;

      urls.push({
        tabId: nav.tabId,
        url: nav.finalUrl ?? nav.requestedUrl,
        offsetPercent:
          urls.length === 0 ? 0 : commandTimeline.getTimelineOffsetForTimestamp(nav.initiatedTime),
        navigationId: nav.id,
        loadStatusOffsets: [],
      });
      const lastUrl = urls[urls.length - 1];

      for (const [loadStatus, name] of loadStatusLookups) {
        const timestamp = nav.statusChanges.get(loadStatus as LoadStatus);
        const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(timestamp);
        if (offsetPercent !== -1) {
          lastUrl.loadStatusOffsets.push({
            status: name,
            offsetPercent,
          });
        }
      }
    }

    const currentTab = this.heroSession.getLastActiveTab();

    urls.push({
      url: currentTab?.url,
      tabId: currentTab?.id,
      navigationId: null, // don't include nav id since we want to resume session at current
      offsetPercent: 100,
      loadStatusOffsets: [],
    });

    const screenshots: IHeroSessionActiveEvent['screenshots'] = [];
    for (const screenshot of this.screenshotsByTimestamp.values()) {
      const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(screenshot.timestamp);
      if (offsetPercent === -1) continue;
      screenshots.push({
        tabId: screenshot.tabId,
        offsetPercent,
        timestamp: screenshot.timestamp,
      });
    }

    const paintEvents: IHeroSessionActiveEvent['paintEvents'] = [];
    for (const [timestamp, domChanges] of this.domChangesByTimestamp) {
      const offsetPercent = commandTimeline.getTimelineOffsetForTimestamp(timestamp);
      if (offsetPercent === -1) continue;
      paintEvents.push({
        domChanges,
        offsetPercent,
      });
    }

    this.lastHeroSessionActiveEvent = <IHeroSessionActiveEvent>{
      hasWarning: false,
      run: this.heroSession.resumeCounter,
      scriptEntrypoint: this.scriptInstanceMeta.entrypoint.split(Path.sep).slice(-2).join(Path.sep),
      scriptLastModifiedTime: this.scriptLastModifiedTime,
      heroSessionId: this.heroSession.id,
      runtimeMs: commandTimeline.runtimeMs,
      playbackState: this.playbackState,
      isHistoryMode: this.replay.isOpen,
      urls,
      screenshots,
      paintEvents,
    };
    return this.lastHeroSessionActiveEvent;
  }

  public getDataboxEvent(): IDataboxUpdatedEvent {
    let commandId: number;
    if (this.replay.isOpen && this.lastHeroSessionActiveEvent) {
      commandId = this.replay.activeTab?.currentTick?.commandId;
    }

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

  public isReplayTab(puppetPageId: string): boolean {
    return this.replay.isReplayPage(puppetPageId);
  }

  public async replayStep(direction: 'forward' | 'back'): Promise<number> {
    let percentOffset: number;
    if (!this.replay.isOpen) {
      percentOffset = 99.9;
    } else if (direction === 'forward') {
      percentOffset = this.replay.activeTab.nextTick?.timelineOffsetPercent ?? 100;
    } else {
      percentOffset = this.replay.activeTab.previousTick?.timelineOffsetPercent ?? 0;
    }
    await this.replayGoto(percentOffset);
    return percentOffset;
  }

  public async replayGoto(timelineOffsetPercent?: number): Promise<void> {
    const startTick = this.replay.activeTab?.currentTick;
    if (this.replay.isOpen) {
      if (timelineOffsetPercent === 100) {
        await this.replay.close();
      } else {
        await this.replay.goto(timelineOffsetPercent);
      }
    } else {
      await this.replay.open(this.heroSession.browserContext, timelineOffsetPercent);
      await this.updateTabGroup(true);
    }
    await this.showLoadStatus(timelineOffsetPercent);
    if (this.replay.activeTab?.currentTick?.commandId !== startTick?.commandId) {
      this.emit('databox:updated');
    }
  }

  public async closeReplay(): Promise<void> {
    await this.replay.close(false);
  }

  private async showLoadStatus(timelineOffsetPercent: number): Promise<void> {
    if (!this.lastHeroSessionActiveEvent || timelineOffsetPercent === 100) return;

    let currentUrl: IHeroSessionActiveEvent['urls'][0];
    let activeStatus: IHeroSessionActiveEvent['urls'][0]['loadStatusOffsets'][0];
    for (const url of this.lastHeroSessionActiveEvent.urls) {
      if (url.offsetPercent > timelineOffsetPercent) break;
      currentUrl = url;
    }

    for (const status of currentUrl?.loadStatusOffsets ?? []) {
      if (status.offsetPercent > timelineOffsetPercent) break;
      activeStatus = status;
    }

    if (activeStatus) {
      await this.replay.showStatusText(activeStatus.status);
    }
  }

  private async onReplayClosed(): Promise<void> {
    await this.updateTabGroup(false);
    this.emit('hero:updated');
  }

  private async updateTabGroup(groupLive: boolean): Promise<void> {
    const tabGroupPlugin = TabGroupCorePlugin.bySessionId.get(this.heroSession.id);
    if (!tabGroupPlugin) return;

    const pages = [...this.heroSession.tabsById.values()].map(x => x.puppetPage);
    if (groupLive === false) await tabGroupPlugin.ungroupTabs(pages);
    else {
      await tabGroupPlugin.groupTabs(
        pages,
        'Reopen Live',
        'blue',
        true,
        this.closeReplay.bind(this),
      );
    }
  }

  private onFileUpdated(stats: Fs.Stats): void {
    this.scriptLastModifiedTime = stats.mtimeMs;
    this.emit('hero:updated');
  }

  private onHeroSessionResumed(): void {
    this.playbackState = 'live';
    this.bindDatabox();
    for (const tab of this.heroSession.tabsById.values()) {
      this.startRecording(tab);
    }
    this.emit('hero:updated');
    this.emit('databox:updated');
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
    this.playbackState = 'paused';
    for (const tab of this.heroSession.tabsById.values()) {
      this.stopRecording(tab);
    }

    this.emit('hero:updated');
    event.message = `ChromeAlive! has assumed control of your script. You can make changes to your script and re-run from the ChromeAlive interface.`;
  }

  private onTabCreated(tabEvent: { tab: Tab }) {
    const tab = tabEvent.tab;
    tab.navigations.on('status-change', this.onStatusChange);
    tab.sessionState.db.domChanges.subscribe(this.onDomChangeRecords);
    tab.once('close', () => {
      tab.sessionState.db.domChanges.unsubscribe();
      tab.navigations.off('status-change', this.onStatusChange);
      this.stopRecording(tab);
    });

    const tabId = tab.id;
    const devtools = tab.puppetPage.devtoolsSession;
    let lastScreenshot: string;
    devtools.on('Page.screencastFrame', event => {
      devtools.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => null);
      if (event.data === lastScreenshot) return;
      lastScreenshot = event.data;

      const nonBlankCharsNeeded = event.data.length * 0.1;
      let nonBlankChars = 0;
      for (const char of event.data) {
        if (char !== 'A') {
          nonBlankChars += 1;
          if (nonBlankChars >= nonBlankCharsNeeded) break;
        }
      }
      if (nonBlankChars < nonBlankCharsNeeded) return;

      const timestamp = event.metadata.timestamp * 1000;

      this.screenshotsByTimestamp.set(timestamp, {
        timestamp,
        imageBase64: event.data,
        tabId,
      });
    });
    // don't start screencast if we're just poking around
    if (this.playbackState === 'paused') return;

    this.startRecording(tab);
  }

  private stopRecording(tab: Tab): void {
    const timestamp = Date.now();
    tab.puppetPage.devtoolsSession
      .send('Page.captureScreenshot')
      .then(x => {
        this.screenshotsByTimestamp.set(timestamp, {
          timestamp,
          tabId: tab.id,
          imageBase64: x.data,
        });
        this.emit('hero:updated');
        return null;
      })
      .catch(() => null);
    tab.puppetPage.devtoolsSession.send('Page.stopScreencast').catch(() => null);
  }

  private startRecording(tab: Tab): void {
    tab.puppetPage.devtoolsSession
      .send('Page.startScreencast', {
        format: 'jpeg',
        quality: 30,
      })
      .catch(() => null);
  }

  private onDomChangeRecords(records: IDomChangeRecord[]): void {
    for (const record of records) {
      const count = this.domChangesByTimestamp.get(record.timestamp) ?? 0;
      this.domChangesByTimestamp.set(record.timestamp, count + 1);
    }
  }

  private onStatusChange(status: IFrameNavigationEvents['status-change']): void {
    if (
      [LoadStatus.DomContentLoaded, LoadStatus.AllContentLoaded, ContentPaint].includes(
        status.newStatus,
      )
    ) {
      this.loadedNavigationIds.add(status.id);
    }
    this.emit('hero:updated');
  }
}
