import { EventEmitter } from 'events';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import BridgeToExtension from '../bridges/BridgeToExtension';
import {
  createResponseId,
  IMessageObject,
  MessageLocation,
  ResponseCode,
} from '../BridgeHelpers';

export default class TabGroupModule {
  public static bySessionId = new Map<string, TabGroupModule>();

  private runOnTabGroupOpened: () => void;

  private bridgeToExtension: BridgeToExtension;
  private identityByPageId = new Map<string, { tabId: number; windowId: number }>();
  private sessionId: string;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    this.bridgeToExtension = bridgeToExtension;
    browserEmitter.on('payload', (payload, { puppetPageId }) => {
      if (payload.event === 'OnTabIdentify') {
        this.onTabIdentified(payload, puppetPageId);
      } else if (payload.event === 'OnTabGroupOpened') {
        this.onTabGroupOpened();
      }
    });
  }

  public onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;

    this.sessionId = sessionSummary.id;
    TabGroupModule.bySessionId.set(this.sessionId, this);
    page.on('close', this.pageClosed.bind(this, page));
    page.browserContext.on('close', this.close.bind(this));
  }

  public close() {
    TabGroupModule.bySessionId.delete(this.sessionId);
  }

  public async groupTabs(
    puppetPages: IPuppetPage[],
    title: string,
    color: string,
    collapsed: boolean,
    onUncollapsed?: () => void,
  ): Promise<number> {
    const tabIds: number[] = [];
    let windowId: number;
    for (const page of puppetPages) {
      const ids = this.identityByPageId.get(page.id);
      if (ids) {
        windowId = ids.windowId;
        tabIds.push(ids.tabId);
      }
    }
    const args = {
      tabIds,
      windowId,
      title,
      color,
      collapsed: true,
    };
    const { groupId } = await this.sendToExtension<{ groupId: number }>(puppetPages[0], 'groupTabs', args, true);
    // don't register the tab group opened command until after it opens
    await new Promise(setImmediate);
    if (collapsed && onUncollapsed) this.runOnTabGroupOpened = onUncollapsed;
    return groupId;
  }

  public async ungroupTabs(puppetPages: IPuppetPage[]): Promise<void> {
    const tabIds: number[] = [];
    for (const page of puppetPages) {
      const ids = this.identityByPageId.get(page.id);
      if (ids) tabIds.push(ids.tabId);
    }
    this.runOnTabGroupOpened = null;
    const args = { tabIds };
    await this.sendToExtension<void>(puppetPages[0], 'ungroupTabs', args, false);
  }

  private onTabGroupOpened(): void {
    if (this.runOnTabGroupOpened) this.runOnTabGroupOpened();
  }

  private onTabIdentified(payload: any, puppetPageId: string, ): void {
    const { windowId, tabId } = payload;
    this.identityByPageId.set(puppetPageId, { windowId, tabId });
  }

  private async sendToExtension<T>(
    puppetPage: IPuppetPage,
    action: string,
    args: object = {},
    waitForResponse = false,
  ): Promise<T> {
    const responseCode = waitForResponse ? ResponseCode.Y : ResponseCode.N;
    const responseId = responseCode === ResponseCode.Y ? createResponseId() : undefined;
    const message: IMessageObject = {
      destLocation: MessageLocation.BackgroundScript,
      origLocation: MessageLocation.Core,
      payload: { action, ...args },
      responseCode,
      responseId,
    };
    return (await this.bridgeToExtension.send(message, puppetPage.id)) as T;
  }

  private pageClosed(page: IPuppetPage) {
    this.identityByPageId.delete(page.id);
  }
}
