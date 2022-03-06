import { EventEmitter } from 'events';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import BridgeToExtension from '../bridges/BridgeToExtension';
import { createResponseId, IMessageObject, MessageLocation, ResponseCode } from '../BridgeHelpers';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';

export default class TabGroupModule extends TypedEventEmitter<{
  'tab-identified': { puppetPageId: string; tabId: number };
}> {
  public static bySessionId = new Map<string, TabGroupModule>();

  public identityByPageId = new Map<string, { tabId: number; windowId: number }>();
  private bridgeToExtension: BridgeToExtension;
  private sessionId: string;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    super();
    this.bridgeToExtension = bridgeToExtension;
    this.close = this.close.bind(this);
    browserEmitter.on('payload', (payload, puppetPageId) => {
      if (payload.event === 'OnTabIdentify') {
        this.onTabIdentified(payload, puppetPageId);
      }
    });
  }

  public onNewPuppetContext(context: IPuppetContext, sessionSummary: ISessionSummary): void {
    this.sessionId = sessionSummary.id;
    TabGroupModule.bySessionId.set(this.sessionId, this);
  }

  public onNewPuppetPage(page: IPuppetPage): Promise<any> {
    page.once('close', this.pageClosed.bind(this, page.id));
    return Promise.resolve();
  }

  public close() {
    TabGroupModule.bySessionId.delete(this.sessionId);
  }

  public async hideTabs(options?: { show?: IPuppetPage[], onlyHide?: IPuppetPage[] }): Promise<void> {
    let puppetPageId: string;
    const showTabIds: number[] = [];
    const onlyHideTabIds: number[] = [];

    for (const puppetPage of options?.show || []) {
      const ids = this.identityByPageId.get(puppetPage.id);
      if (ids) {
        puppetPageId ??= puppetPage.id;
        showTabIds.push(ids.tabId);
      }
    }

    for (const puppetPage of options?.onlyHide || []) {
      const ids = this.identityByPageId.get(puppetPage.id);
      if (ids) {
        puppetPageId ??= puppetPage.id;
        onlyHideTabIds.push(ids.tabId);
      }
    }

    if (!puppetPageId) {
      for (const [ pageId ] of this.identityByPageId.entries()) {
        puppetPageId = pageId;
        break;
      }
    }

    const args = { showTabIds, onlyHideTabIds };
    console.log('hideTabs: ', args);
    await this.sendToExtension<void>(
      puppetPageId,
      'hideTabs',
      args,
      true,
    );
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
    puppetPageId: string,
    action: string,
    args: object = {},
    waitForResponse = false,
  ): Promise<T> {
    if (!puppetPageId) return;

    const responseCode = waitForResponse ? ResponseCode.Y : ResponseCode.N;
    const responseId = responseCode === ResponseCode.Y ? createResponseId() : undefined;
    const message: IMessageObject = {
      destLocation: MessageLocation.BackgroundScript,
      origLocation: MessageLocation.Core,
      payload: { action, ...args },
      responseCode,
      responseId,
    };
    return (await this.bridgeToExtension.send(message, puppetPageId)) as T;
  }

  private pageClosed(pageId: string) {
    this.identityByPageId.delete(pageId);
  }
}
