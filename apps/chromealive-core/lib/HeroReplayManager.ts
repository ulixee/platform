import Core, { Session as HeroSession } from '@ulixee/hero-core';
import DirectConnectionToCoreApi from '@ulixee/hero-core/connections/DirectConnectionToCoreApi';
import HeroSessionReplay from '@ulixee/hero-core/lib/SessionReplay';
import { PluginTypes } from '@ulixee/hero-interfaces/IPluginTypes';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import TabGroupCorePlugin from '../hero-plugins/TabGroupCorePlugin';

export default class HeroReplayManager extends TypedEventEmitter<{ close: void }> {
  public get isOpen(): boolean {
    return this.replay.isOpen;
  }

  private isClosing: Promise<void>;
  private replay: HeroSessionReplay;

  constructor(readonly heroSession: HeroSession) {
    super();
    const connectionToCoreApi = new DirectConnectionToCoreApi();
    this.replay = new HeroSessionReplay(
      heroSession.id,
      connectionToCoreApi,
      // only use core plugins - no emulators
      heroSession.plugins.instances.filter(x => {
        if (x.id === 'default-human-emulator' || x.id === 'default-browser-emulator') return false;
        return Core.pluginMap.corePluginsById[x.id].type === PluginTypes.CorePlugin;
      }),
    );
    this.replay.on('all-tabs-closed', this.close.bind(this));
  }

  public isReplayTab(puppetPageId: string): boolean {
    return this.replay.isReplayPage(puppetPageId);
  }

  public async setOffset(playbarPercentOffset: number): Promise<void> {
    if (!this.isOpen) {
      await this.open(playbarPercentOffset);
      return;
    }

    await this.replay.goto(playbarPercentOffset);
  }

  public async open(playbarPercentOffset?: number): Promise<void> {
    if (this.isOpen) return;
    this.isClosing = null;
    await this.groupLiveTabs();
    await this.replay.open(this.heroSession.browserContext, playbarPercentOffset);
  }

  public async close() {
    this.isClosing ??= this.closeInternal();
    return await this.isClosing;
  }

  private async closeInternal(): Promise<void> {
    await this.replay.close(false);
    const liveTabs = [...this.heroSession.tabsById.values()];
    await this.getSessionTabGroupPlugin()?.ungroupTabs(liveTabs.map(x => x.puppetPage));
    this.emit('close');
  }

  private async groupLiveTabs(): Promise<void> {
    const liveTabs = [...this.heroSession.tabsById.values()];
    await this.getSessionTabGroupPlugin()?.groupTabs(
      liveTabs.map(x => x.puppetPage),
      'Reopen Live',
      'blue',
      true,
    );
  }

  private getSessionTabGroupPlugin(): TabGroupCorePlugin {
    return TabGroupCorePlugin.bySessionId.get(this.heroSession.id);
  }
}
