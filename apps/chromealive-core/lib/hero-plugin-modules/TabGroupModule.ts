import { EventEmitter } from 'events';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import BridgeToExtension from '../bridges/BridgeToExtension';
import { createResponseId, IMessageObject, MessageLocation, ResponseCode } from '../BridgeHelpers';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';

export default class TabGroupModule extends TypedEventEmitter<{
  'tab-group-opened': number;
  'tab-identified': { puppetPageId: string; tabId: number };
}> {
  public static bySessionId = new Map<string, TabGroupModule>();

  public identityByPageId = new Map<string, { tabId: number; windowId: number }>();
  private bridgeToExtension: BridgeToExtension;
  private sessionId: string;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    super();
    this.bridgeToExtension = bridgeToExtension;
    browserEmitter.on('payload', (payload, puppetPageId) => {
      if (payload.event === 'OnTabIdentify') {
        this.onTabIdentified(payload, puppetPageId);
      } else if (payload.event === 'OnTabGroupOpened') {
        this.emit('tab-group-opened', payload.groupId);
      }
    });
  }

  public onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    this.sessionId = sessionSummary.id;
    TabGroupModule.bySessionId.set(this.sessionId, this);
    page.on('close', this.pageClosed.bind(this, page));
    page.browserContext.on('close', this.close.bind(this));
    return Promise.resolve();
  }

  public close() {
    TabGroupModule.bySessionId.delete(this.sessionId);
  }

  public async groupTabs(
    puppetPages: IPuppetPage[],
    title: string,
    color: string,
    collapsed: boolean,
  ): Promise<number> {
    if (!puppetPages.length) return;

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
      collapsed,
    };
    const { groupId } = await this.sendToExtension<{ groupId: number }>(
      puppetPages[0],
      'groupTabs',
      args,
      true,
    );
    return groupId;
  }

  public async ungroupTabs(puppetPages: IPuppetPage[]): Promise<void> {
    const tabIds: number[] = [];
    for (const page of puppetPages) {
      const ids = this.identityByPageId.get(page.id);
      if (ids) tabIds.push(ids.tabId);
    }
    const args = { tabIds };
    await this.sendToExtension<void>(puppetPages[0], 'ungroupTabs', args, false);
  }

  public async collapseGroup(puppetPage: IPuppetPage, groupId: number): Promise<void> {
    await this.sendToExtension<void>(puppetPage, 'collapseGroup', { groupId }, false);
  }

  private onTabIdentified(
    payload: { windowId: number; tabId: number },
    puppetPageId: string,
  ): void {
    const { windowId, tabId } = payload;
    this.identityByPageId.set(puppetPageId, { windowId, tabId });
    this.emit('tab-identified', { puppetPageId, tabId });
  }

  private async sendToExtension<T>(
    puppetPage: IPuppetPage,
    action: string,
    args: object = {},
    waitForResponse = false,
  ): Promise<T> {
    if (!puppetPage) return;

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
