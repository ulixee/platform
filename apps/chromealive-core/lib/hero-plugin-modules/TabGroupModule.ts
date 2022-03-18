import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import HeroCorePlugin from '../HeroCorePlugin';

export default class TabGroupModule {
  constructor(private heroPlugin: HeroCorePlugin) {}

  public async showTabs(...pages: IPuppetPage[]): Promise<void> {
    const showTabIds: number[] = [];

    const puppetPageId = await this.heroPlugin.getIdentifiedPuppetPageId();
    for (const puppetPage of pages) {
      const tabId = await this.heroPlugin.getTabIdByPuppetPageId(puppetPage.id);
      if (tabId) {
        showTabIds.push(tabId);
      }
    }

    const args = { showTabIds };
    await this.heroPlugin.sendToExtension<void>(puppetPageId, 'hideTabs', args, true);
  }
}
