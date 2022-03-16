import { EventEmitter } from 'events';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import BridgeToExtension from '../bridges/BridgeToExtension';
import { createResponseId, IMessageObject, MessageLocation, ResponseCode } from '../BridgeHelpers';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import Resolvable from '@ulixee/commons/lib/Resolvable';

interface IPageIdentity {
  tabId: number;
  windowId: number;
}
export default class TabGroupModule {
  public static bySessionId = new Map<string, TabGroupModule>();

  private identityByPuppetPage = new Map<IPuppetPage, IResolvablePromise<IPageIdentity>>();
  private puppetPagesById = new Map<string, IPuppetPage>();
  private bridgeToExtension: BridgeToExtension;
  private sessionId: string;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
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

  public onNewPuppetPage(puppetPage: IPuppetPage): Promise<any> {
    this.puppetPagesById.set(puppetPage.id, puppetPage);
    this.identityByPuppetPage.set(
      puppetPage,
      createPromise<IPageIdentity>(2e3, 'PuppetPage never received Tab ID'),
    );
    puppetPage.once('close', this.puppetPageClosed.bind(this, puppetPage));
    return Promise.resolve();
  }

  public async getTabIdByPuppetPageId(puppetPageId: string): Promise<number> {
    const puppetPage = this.puppetPagesById.get(puppetPageId);
    const { tabId } = await this.identityByPuppetPage.get(puppetPage).promise;
    return tabId;
  }

  public async getPuppetPageByTabId(tabId: number): Promise<IPuppetPage> {
    const puppetPages = Array.from(this.identityByPuppetPage.keys());
    const identities = await Promise.all(this.identityByPuppetPage.values());
    return puppetPages.find((puppetPage, i) => identities[i].tabId === tabId);
  }

  public async showTabs(...pages: IPuppetPage[]): Promise<void> {
    let puppetPageId: string;
    const showTabIds: number[] = [];

    for (const puppetPage of pages) {
      const identity = await this.identityByPuppetPage.get(puppetPage).promise;
      if (identity) {
        puppetPageId ??= puppetPage.id;
        showTabIds.push(identity.tabId);
      }
    }

    puppetPageId ??= this.identityByPuppetPage.keys().next().value;

    const args = { showTabIds };
    await this.sendToExtension<void>(puppetPageId, 'hideTabs', args, true);
  }

  public close() {
    TabGroupModule.bySessionId.delete(this.sessionId);
  }

  private onTabIdentified(
    payload: { windowId: number; tabId: number },
    puppetPageId: string,
  ): void {
    const { windowId, tabId } = payload;
    const puppetPage = this.puppetPagesById.get(puppetPageId);
    this.identityByPuppetPage.get(puppetPage).resolve({ windowId, tabId });
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

  private puppetPageClosed(puppetPage: IPuppetPage) {
    this.identityByPuppetPage.delete(puppetPage);
    this.puppetPagesById.delete(puppetPage.id);
  }
}
