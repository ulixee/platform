import Page from '@ulixee/unblocked-agent/lib/Page';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import IDevtoolsSession, {Protocol} from '@ulixee/unblocked-specification/agent/browser/IDevtoolsSession';
import { IBrowserContextHooks } from '@ulixee/unblocked-specification/agent/hooks/IBrowserHooks';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import BridgeToExtension from './bridges/BridgeToExtension';
import DevtoolsBackdoorModule from './app-extension-modules/DevtoolsBackdoorModule';
import ElementsModule from './app-extension-modules/ElementsModule';
import AppDevtoolsConnection from './AppDevtoolsConnection';
import TargetInfo = Protocol.Target.TargetInfo;

export default class ChromeAliveWindowController implements IBrowserContextHooks {
  // TODO: support multiple replay tabs for finder
  public get activePage(): Page {
    return this.pages[0];
  }

  public devtoolsBackdoorModule: DevtoolsBackdoorModule;
  public elementsModule: ElementsModule;

  private pages: Page[] = [];
  private readonly events = new EventSubscriber();
  private readonly bridgeToExtension: BridgeToExtension;
  private readonly pagesById = new Map<string, Page>();
  private readonly pendingPagePromisesByTabId = new Map<number, Resolvable<Page>>();
  private readonly idsByTargetId = new Map<string, { chromeTabId: number; heroTabId: number }>();

  constructor(
    readonly sessionId: string,
    readonly appDevtoolsConnection: AppDevtoolsConnection,
    readonly sendApiEvent: <T extends keyof IChromeAliveSessionEvents>(
      eventType: T,
      data?: IChromeAliveSessionEvents[T],
    ) => void,
  ) {
    this.bridgeToExtension = new BridgeToExtension();
    this.elementsModule = new ElementsModule(this);
    this.devtoolsBackdoorModule = new DevtoolsBackdoorModule(this);
  }

  public async showElementsPanel(): Promise<void> {
    await this.devtoolsBackdoorModule.showElementsPanel(this.activePage);
  }

  public getChromeTabIdByPageId(pageId: string): number {
    return this.idsByTargetId.get(pageId)?.chromeTabId;
  }

  public getPageByChromeTabId(chromeTabId: number): Page {
    for (const [pageId, ids] of this.idsByTargetId) {
      if (ids.chromeTabId === chromeTabId) return this.pagesById.get(pageId);
    }
  }

  public getPageByHeroTabId(heroTabId: number): Page {
    for (const [targetId, entry] of this.idsByTargetId) {
      if (entry.heroTabId === heroTabId) return this.pagesById.get(targetId);
    }
  }

  public async waitForPageWithHeroTabId(heroTabId: number): Promise<Page> {
    const existing = this.getPageByHeroTabId(heroTabId);
    if (existing) return existing;
    if (!this.pendingPagePromisesByTabId.has(heroTabId)) {
      this.pendingPagePromisesByTabId.set(heroTabId, new Resolvable<Page>());
    }
    return await this.pendingPagePromisesByTabId.get(heroTabId).promise;
  }

  public onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession, targetInfo: TargetInfo): Promise<any> {
    return this.devtoolsBackdoorModule.onDevtoolsPanelAttached(devtoolsSession, targetInfo);
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession): Promise<any> {
    this.devtoolsBackdoorModule.onDevtoolsPanelDetached(devtoolsSession);
    return Promise.resolve();
  }

  public async onDevtoolsOpenedInApp(target: {
    targetId: string;
    browserContextId: string;
    isReconnect?: boolean;
  }): Promise<void> {
    await this.appDevtoolsConnection.attachToDevtools(target.targetId);
  }

  public async addTarget(target: {
    targetId: string;
    chromeTabId: number;
    heroTabId: number;
    browserContextId: string;
    isReconnect?: boolean;
  }): Promise<void> {
    const { chromeTabId, targetId, heroTabId, browserContextId } = target;
    this.idsByTargetId.set(targetId, { chromeTabId, heroTabId });
    const page = await this.appDevtoolsConnection.attachToPage(targetId, browserContextId, this);
    this.pages.push(page);
    if (!this.pendingPagePromisesByTabId.has(heroTabId)) {
      this.pendingPagePromisesByTabId.set(heroTabId, new Resolvable<Page>());
    }

    await this.bridgeToExtension.addPage(page, this.events);
    await this.elementsModule.onNewPage(page);
    this.pagesById.set(page.targetId, page);
    this.pendingPagePromisesByTabId.get(heroTabId).resolve(page);
  }
}
