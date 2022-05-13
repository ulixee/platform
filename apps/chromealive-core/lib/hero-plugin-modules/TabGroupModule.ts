import { IPage } from '@unblocked-web/specifications/agent/browser/IPage';
import HeroCorePlugin from '../HeroCorePlugin';

export default class TabGroupModule {
  constructor(private heroPlugin: HeroCorePlugin) {}

  public async showTabs(...pages: IPage[]): Promise<void> {
    const showTabIds: number[] = [];

    const pageId = this.heroPlugin.activePage.id;
    for (const page of pages) {
      const tabId = await this.heroPlugin.getTabIdByPageId(page.id);
      if (tabId) {
        showTabIds.push(tabId);
      }
    }

    const args = { showTabIds };
    await this.heroPlugin.sendToExtension<void>(pageId, 'hideTabs', args, true);
  }
}
