import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import ExtensionRuntimeMessenger from '../lib/ExtensionRuntimeMessenger';

export default class TabGroupCorePlugin extends CorePlugin {
  public static id = '@ulixee/tabgroup-core-plugin';

  public static bySessionId = new Map<string, TabGroupCorePlugin>();

  private runOnTabGroupOpened: () => void;

  private extensionMessengersByPageId = new Map<string, ExtensionRuntimeMessenger>();
  private identityByPageId = new Map<string, { tabId: number; windowId: number }>();
  private sessionId: string;

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;

    this.sessionId = sessionSummary.id;
    TabGroupCorePlugin.bySessionId.set(this.sessionId, this);
    page.on('close', this.pageClosed.bind(this, page));
    page.browserContext.on('close', this.close.bind(this));
    this.extensionMessengersByPageId.set(page.id, new ExtensionRuntimeMessenger(page));

    return Promise.all([
      page.addPageCallback('___onTabIdentify', this.onTabIdentified.bind(this, page.id)),
      page.addPageCallback('___onTabGroupOpened', this.onTabGroupOpened.bind(this)),
    ]);
  }

  close() {
    TabGroupCorePlugin.bySessionId.delete(this.sessionId);
  }

  async groupTabs(
    puppetPages: IPuppetPage[],
    title: string,
    color: string,
    collapsed: boolean,
    onUncollapsed?: () => void,
  ): Promise<number> {
    const tabIds: number[] = [];
    let windowId: number;
    let pageId: string;
    for (const page of puppetPages) {
      pageId ??= page.id;
      const id = this.identityByPageId.get(page.id);
      if (id) {
        windowId = id.windowId;
        tabIds.push(id.tabId);
      }
    }
    const groupId = await this.callExtensionAction<number>(pageId, 'groupTabs', {
      tabIds,
      windowId,
      title,
      color,
      collapsed: true,
    });
    // don't register the tab group opened command until after it opens
    await new Promise(setImmediate);
    if (collapsed && onUncollapsed) this.runOnTabGroupOpened = onUncollapsed;
    return groupId;
  }

  async ungroupTabs(puppetPages: IPuppetPage[]): Promise<void> {
    const tabIds: number[] = [];
    for (const page of puppetPages) {
      const id = this.identityByPageId.get(page.id);
      if (id) tabIds.push(id.tabId);
    }
    this.runOnTabGroupOpened = null;
    return await this.callExtensionAction<void>(puppetPages[0].id, 'ungroupTabs', {
      tabIds,
    });
  }

  private onTabGroupOpened(): void {
    if (this.runOnTabGroupOpened) this.runOnTabGroupOpened();
  }

  private async identifyTab(puppetPageId: string): Promise<void> {
    const { tabId, windowId } = await this.callExtensionAction(puppetPageId, 'identify');

    this.identityByPageId.set(puppetPageId, { tabId, windowId });
  }

  private onTabIdentified(puppetPageId: string, payload: string): void {
    const { windowId, tabId } = JSON.parse(payload);
    this.identityByPageId.set(puppetPageId, { windowId, tabId });
  }

  private async callExtensionAction<T>(
    puppetPageId: string,
    action: string,
    args: object = {},
  ): Promise<T> {
    const messenger = this.extensionMessengersByPageId.get(puppetPageId);
    if (!messenger)
      throw new Error(`Extension runtime messenger not found for puppet page ${puppetPageId}`);
    const message = { action, ...args };
    return await messenger.send(message);
  }

  private pageClosed(page: IPuppetPage) {
    this.identityByPageId.delete(page.id);
    this.extensionMessengersByPageId.delete(page.id);
  }
}
