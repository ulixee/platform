import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import * as Path from 'path';
import ICorePluginCreateOptions from '@ulixee/hero-interfaces/ICorePluginCreateOptions';
import { IPage } from '@ulixee/unblocked-specification/agent/browser/IPage';
import { CorePluginClassDecorator, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IDevtoolsSession from '@ulixee/unblocked-specification/agent/browser/IDevtoolsSession';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { IWorker } from '@ulixee/unblocked-specification/agent/browser/IWorker';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import IViewport from '@ulixee/unblocked-specification/agent/browser/IViewport';
import IBrowser from '@ulixee/unblocked-specification/agent/browser/IBrowser';
import { BrowserContext, Page } from '@ulixee/unblocked-agent';
import IEmulationProfile from '@ulixee/unblocked-specification/plugin/IEmulationProfile';
import EventEmitter = require('events');
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import { extensionId } from './ExtensionUtils';
import DevtoolsBackdoorModule from './hero-plugin-modules/DevtoolsBackdoorModule';
import ElementsModule from './hero-plugin-modules/ElementsModule';
import { createResponseId, IMessageObject, MessageLocation, ResponseCode } from './BridgeHelpers';
import ChromeAliveCore from '../index';
import AliveBarPositioner from './AliveBarPositioner';
import BridgeToExtension from './bridges/BridgeToExtension';

// have to resolve an actual file
export const extensionPath = Path.resolve(__dirname, '../extension').replace(
  'app.asar',
  'app.asar.unpacked',
); // make electron packaging friendly

@CorePluginClassDecorator
export default class HeroCorePlugin extends CorePlugin {
  public static override id = '@ulixee/chromealive-hero-core-plugin';

  public static bySessionId = new Map<string, HeroCorePlugin>();

  public activePage: Page;
  public tabGroupModule: TabGroupModule;
  public devtoolsBackdoorModule: DevtoolsBackdoorModule;
  public elementsModule: ElementsModule;
  public sessionId: string;
  public mirrorPage: Page;

  private readonly bridgeToExtension: BridgeToExtension;
  private readonly identityByPage = new Map<Page, IResolvablePromise<IPageIdentity>>();
  private readonly pagesById = new Map<string, Page>();
  private readonly events = new EventSubscriber();
  private readonly browserEmitter = new EventEmitter();
  private hasRegisteredServiceWorkerDebug = false;

  constructor(createOptions: ICorePluginCreateOptions) {
    super(createOptions);
    this.bridgeToExtension = new BridgeToExtension();

    this.tabGroupModule = new TabGroupModule(this);
    this.elementsModule = new ElementsModule(this);
    this.devtoolsBackdoorModule = new DevtoolsBackdoorModule(this);

    this.events.on(this.bridgeToExtension, 'message', this.onBridgeMessage.bind(this));
  }

  public async getTabIdByPageId(pageId: string): Promise<number> {
    const page = this.pagesById.get(pageId);
    try {
      const { tabId } = await this.identityByPage.get(page).promise;
      return tabId;
    } catch (error) {
      console.warn('Could not get tab id for browser page', { pageId, error });
      return null;
    }
  }

  public async getPageByTabId(tabId: number): Promise<Page> {
    for (const [page, identity] of this.identityByPage) {
      try {
        const id = await identity;
        if (id.tabId === tabId) return page;
      } catch (err) {
        // no-op
      }
    }
  }

  /// /// PLUGIN IMPLEMENTATION METHODS ////////////////////////////////////////////////////////////////////////////////

  public configure(options: IEmulationProfile): Promise<any> | void {
    if ((options.viewport as any)?.isDefault) {
      Object.assign(options.viewport, this.getMaxChromeViewport());
    }
  }

  public onNewBrowser(browser: IBrowser): void {
    const launchArguments = browser.engine.launchArguments;
    launchArguments.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    );
  }

  public async onNewBrowserContext(context: BrowserContext): Promise<any> {
    const id = this.sessionSummary.id;
    this.sessionId = id;
    HeroCorePlugin.bySessionId.set(id, this);
    this.events.once(context, 'close', this.onBrowserContextClosed.bind(this, this.sessionSummary));

    // the Default context can be re-used, so check for an existing mirrorPage
    for (const page of context.pagesById.values()) {
      if (page.groupName === 'mirrorPage') {
        this.mirrorPage = page;
        break;
      }
    }

    this.mirrorPage = await context.newPage({
      runPageScripts: false,
      enableDomStorageTracker: false,
      groupName: 'mirrorPage',
      installJsPathIntoDefaultContext: true,
    });

    await this.onNewPage(this.mirrorPage);
  }

  public async onNewPage(page: Page): Promise<any> {
    this.pagesById.set(page.id, page);
    if (page.groupName === 'session') {
      this.activePage ??= page;
    }
    const identityTimeout = page.groupName === 'mirrorPage' ? undefined : 10e3;
    this.identityByPage.set(
      page,
      createPromise<IPageIdentity>(identityTimeout, 'Page never received Tab ID'),
    );
    this.identityByPage.get(page).promise.catch(console.warn);
    this.events.once(page, 'close', this.onPageClosed.bind(this, page));

    if (process.env.ULX_CHROMEALIVE_DEBUG) {
      if (!this.hasRegisteredServiceWorkerDebug) this.debugServiceWorker(page.devtoolsSession);
      this.hasRegisteredServiceWorkerDebug = true;
    }

    await Promise.all([
      // needed to know when to blur tab and thus ChromeAlive bar (otherwise they all think they're still active)
      page.devtoolsSession
        .send('Emulation.setFocusEmulationEnabled', { enabled: false })
        .catch(err => err),
      this.bridgeToExtension.addPage(page, this.events),
      this.setPageViewportToWindowBounds(page),
      this.elementsModule.onNewPage(page),
    ]);
  }

  public onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<any> {
    return this.devtoolsBackdoorModule.onDevtoolsPanelAttached(devtoolsSession);
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession): Promise<any> {
    this.devtoolsBackdoorModule.onDevtoolsPanelDetached(devtoolsSession);
    return Promise.resolve();
  }

  public onNewWorker(worker: IWorker): Promise<any> {
    if (worker.url !== `chrome-extension://${extensionId}/background.js`) return;
  }

  public onPageClosed(page: Page): void {
    this.identityByPage.get(page)?.resolve(null);
    this.identityByPage.delete(page);
    this.pagesById.delete(page.id);
    if (this.activePage?.id === page.id) {
      this.activePage = undefined;
    }
    ChromeAliveCore.changeActiveSessions(
      { active: false, focused: false },
      this.sessionId,
      page.id,
    );
  }

  public onBrowserContextClosed(sessionSummary: ISessionSummary): void {
    HeroCorePlugin.bySessionId.delete(sessionSummary.id);
    this.mirrorPage?.close().catch(err => console.error('Error closing mirror browser page', err));
    this.devtoolsBackdoorModule.close();
    this.events.close();
    this.browserEmitter.removeAllListeners();
  }

  public async sendToExtension<T>(
    pageId: string,
    action: string,
    args: object = {},
    waitForResponse = false,
  ): Promise<T> {
    if (!pageId) return;

    const responseCode = waitForResponse ? ResponseCode.Y : ResponseCode.N;
    const responseId = responseCode === ResponseCode.Y ? createResponseId() : undefined;
    const message: IMessageObject = {
      destLocation: MessageLocation.BackgroundScript,
      origLocation: MessageLocation.Core,
      payload: { action, ...args },
      responseCode,
      responseId,
    };
    return (await this.bridgeToExtension.send(message, pageId)) as T;
  }

  /// ///// BRIDGE MESSAGE HANDLER /////////////////////////////////////////////////////////////////////////////////////

  private onBridgeMessage(
    message: any,
    messageComponents: {
      destLocation: keyof typeof MessageLocation;
      stringifiedMessage: string;
      pageId: string;
    },
  ): void {
    const { destLocation, stringifiedMessage, pageId } = messageComponents;
    if (destLocation !== MessageLocation.Core) return;

    const { payload } = JSON.parse(stringifiedMessage);
    if (payload.event === 'OnTabIdentify') {
      this.onTabIdentified(payload, pageId);
    } else if (payload.event === 'OnPageVisible') {
      this.handlePageIsVisible(payload, pageId);
    } else if (payload.event === 'OnWindowBounds') {
      this.onBoundsChanged(payload.windowBounds);
    }
  }

  private handlePageIsVisible(payload: any, pageId: string): void {
    this.activePage = this.pagesById.get(pageId);
    ChromeAliveCore.changeActiveSessions(
      { active: true, focused: payload.focused },
      this.sessionId,
      pageId,
    );
  }

  private onTabIdentified(payload: { windowId: number; tabId: number }, pageId: string): void {
    const { windowId, tabId } = payload;
    const page = this.pagesById.get(pageId);
    this.identityByPage.get(page).resolve({ windowId, tabId });
  }

  /// /// VIEWPORT FULL SCREEN /////////////////////////////////////////////////////////////////////////////////////////

  private onBoundsChanged(payload: IBounds & { windowId: number }): void {
    const { windowId, ...bounds } = payload;
    AliveBarPositioner.onChromeWindowBoundsChanged(this.sessionId, bounds);
  }

  private async setPageViewportToWindowBounds(page: IPage): Promise<void> {
    const { windowId, bounds } = await page.devtoolsSession.send('Browser.getWindowForTarget');

    AliveBarPositioner.onChromeWindowBoundsChanged(this.sessionId, bounds as IBounds);

    const maxBounds = AliveBarPositioner.getMaxChromeBounds();
    if (!maxBounds) return;
    if (maxBounds.height === bounds.height && maxBounds.width === bounds.width) return;

    await page.devtoolsSession.send('Browser.setWindowBounds', {
      windowId,
      bounds: {
        ...maxBounds,
        windowState: 'normal',
      },
    });
  }

  private getMaxChromeViewport(): IViewport {
    const maxChromeBounds = AliveBarPositioner.getMaxChromeBounds();
    return {
      width: 0,
      height: 0,
      deviceScaleFactor: 0,
      positionX: maxChromeBounds?.left,
      positionY: maxChromeBounds?.top,
      screenWidth: maxChromeBounds?.width,
      screenHeight: maxChromeBounds?.height,
      mobile: undefined,
    } as IViewport;
  }

  private debugServiceWorker(devtoolsSession: IDevtoolsSession): void {
    devtoolsSession.send('ServiceWorker.enable').catch(console.error);
    this.events.on(devtoolsSession, 'ServiceWorker.workerErrorReported', ev =>
      // eslint-disable-next-line no-console
      console.debug('ServiceWorker.workerErrorReported', ev.errorMessage),
    );
    this.events.on(devtoolsSession, 'ServiceWorker.workerRegistrationUpdated', ev =>
      // eslint-disable-next-line no-console
      console.debug('ServiceWorker.workerRegistrationUpdated', ...ev.registrations),
    );
    this.events.on(devtoolsSession, 'ServiceWorker.workerVersionUpdated', ev =>
      // eslint-disable-next-line no-console
      console.debug('ServiceWorker.workerVersionUpdated', ...ev.versions),
    );
  }

  public static shouldActivate(profile: IEmulationProfile, session: ISessionSummary): boolean {
    return session.options.showChromeAlive && session.options.showChrome;
  }
}

interface IPageIdentity {
  tabId: number;
  windowId: number;
}
