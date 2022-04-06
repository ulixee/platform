import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import * as Path from 'path';
import ICorePluginCreateOptions from '@ulixee/hero-interfaces/ICorePluginCreateOptions';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import BridgeToExtension from './bridges/BridgeToExtension';
import { createPromise } from '@ulixee/commons/lib/utils';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import { extensionId } from './ExtensionUtils';
import DevtoolsBackdoorModule from './hero-plugin-modules/DevtoolsBackdoorModule';
import ElementsModule from './hero-plugin-modules/ElementsModule';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import { createResponseId, IMessageObject, MessageLocation, ResponseCode } from './BridgeHelpers';
import ChromeAliveCore from '../index';
import AliveBarPositioner from './AliveBarPositioner';
import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import EventEmitter = require('events');
import IViewport from '@ulixee/hero-interfaces/IViewport';

// have to resolve an actual file
export const extensionPath = Path.resolve(__dirname, '../..', 'chromealive/extension').replace(
  'app.asar',
  'app.asar.unpacked',
); // make electron packaging friendly

export default class HeroCorePlugin extends CorePlugin {
  public static id = '@ulixee/chromealive-hero-core-plugin';

  public static bySessionId = new Map<string, HeroCorePlugin>();

  public activePuppetPage: IPuppetPage;
  public tabGroupModule: TabGroupModule;
  public devtoolsBackdoorModule: DevtoolsBackdoorModule;
  public elementsModule: ElementsModule;
  public sessionId: string;
  public mirrorPuppetPage: IPuppetPage;

  private readonly bridgeToExtension: BridgeToExtension;
  private readonly identityByPuppetPage = new Map<IPuppetPage, IResolvablePromise<IPageIdentity>>();
  private readonly puppetPagesById = new Map<string, IPuppetPage>();
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

  public async getTabIdByPuppetPageId(puppetPageId: string): Promise<number> {
    const puppetPage = this.puppetPagesById.get(puppetPageId);
    try {
      const { tabId } = await this.identityByPuppetPage.get(puppetPage).promise;
      return tabId;
    } catch (error) {
      console.warn('Could not get tab id for puppet page', { puppetPageId, error });
      return null;
    }
  }

  public async getPuppetPageByTabId(tabId: number): Promise<IPuppetPage> {
    for (const [page, identity] of this.identityByPuppetPage) {
      try {
        const id = await identity;
        if (id.tabId === tabId) return page;
      } catch (err) {
        // no-op
      }
    }
  }

  /// /// PLUGIN IMPLEMENTATION METHODS ////////////////////////////////////////////////////////////////////////////////

  public configure(options: IBrowserEmulatorConfig): Promise<any> | void {
    if ((options.viewport as any)?.isDefault) {
      Object.assign(options.viewport, this.getMaxChromeViewport());
    }
  }

  public onBrowserLaunchConfiguration(launchArguments: string[]): void {
    if (launchArguments.includes('--headless')) return;

    launchArguments.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    );
  }

  public async onNewPuppetContext(
    context: IPuppetContext,
    sessionSummary: ISessionSummary,
  ): Promise<any> {
    if (context.isIncognito || sessionSummary.options.showBrowser === false) return;

    const id = sessionSummary.id;
    this.sessionId = id;
    HeroCorePlugin.bySessionId.set(id, this);
    this.events.once(context, 'close', this.onBrowserContextClosed.bind(this, sessionSummary));

    // the Default context can be re-used, so check for an existing mirrorPage
    for (const page of context.pagesById.values()) {
      if (page.groupName === 'mirrorPage') {
        this.mirrorPuppetPage = page;
        break;
      }
    }

    this.mirrorPuppetPage = await context.newPage({
      runPageScripts: false,
      enableDomStorageTracker: false,
      groupName: 'mirrorPage',
    });

    await this.onNewPuppetPage(this.mirrorPuppetPage, sessionSummary);
  }

  public async onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (page.browserContext.isIncognito || sessionSummary.options.showBrowser === false) return;

    this.puppetPagesById.set(page.id, page);
    if (page.groupName === 'session') {
      this.activePuppetPage ??= page;
    }
    const identityTimeout = page.groupName === 'mirrorPage' ? undefined : 10e3;
    this.identityByPuppetPage.set(
      page,
      createPromise<IPageIdentity>(identityTimeout, 'PuppetPage never received Tab ID'),
    );
    this.identityByPuppetPage.get(page).promise.catch(console.warn);
    this.events.once(page, 'close', this.onPuppetPageClosed.bind(this, page));

    if (process.env.HERO_DEBUG_CHROMEALIVE) {
      if (!this.hasRegisteredServiceWorkerDebug) this.debugServiceWorker(page.devtoolsSession);
      this.hasRegisteredServiceWorkerDebug = true;
    }

    await Promise.all([
      // needed to know when to blur tab and thus ChromeAlive bar (otherwise they all think they're still active)
      page.devtoolsSession.send('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(err => err),
      this.bridgeToExtension.addPuppetPage(page, this.events),
      this.setPageViewportToWindowBounds(page),
      this.elementsModule.onNewPuppetPage(page),
    ]);
  }

  public onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<any> {
    return this.devtoolsBackdoorModule.onDevtoolsPanelAttached(devtoolsSession);
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession): Promise<any> {
    this.devtoolsBackdoorModule.onDevtoolsPanelDetached(devtoolsSession);
    return Promise.resolve();
  }

  public onServiceWorkerAttached(
    devtoolsSession: IDevtoolsSession,
    event: Protocol.Target.AttachedToTargetEvent,
  ): Promise<any> {
    const { targetInfo } = event;
    if (targetInfo.url !== `chrome-extension://${extensionId}/background.js`) return;
  }

  public onPuppetPageClosed(puppetPage: IPuppetPage): void {
    this.identityByPuppetPage.get(puppetPage)?.resolve(null);
    this.identityByPuppetPage.delete(puppetPage);
    this.puppetPagesById.delete(puppetPage.id);
    if (this.activePuppetPage?.id === puppetPage.id) {
      this.activePuppetPage = undefined;
    }
    ChromeAliveCore.changeActiveSessions(
      { active: false, focused: false },
      this.sessionId,
      puppetPage.id,
    );
  }

  public onBrowserContextClosed(sessionSummary: ISessionSummary): void {
    HeroCorePlugin.bySessionId.delete(sessionSummary.id);
    this.mirrorPuppetPage
      ?.close()
      .catch(err => console.error('Error closing mirror puppet page', err));
    this.devtoolsBackdoorModule.close();
    this.events.close();
    this.browserEmitter.removeAllListeners();
  }

  public async sendToExtension<T>(
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

  /// ///// BRIDGE MESSAGE HANDLER /////////////////////////////////////////////////////////////////////////////////////

  private onBridgeMessage(
    message: any,
    messageComponents: {
      destLocation: keyof typeof MessageLocation;
      stringifiedMessage: string;
      puppetPageId: string;
    },
  ): void {
    const { destLocation, stringifiedMessage, puppetPageId } = messageComponents;
    if (destLocation !== MessageLocation.Core) return;

    const { payload } = JSON.parse(stringifiedMessage);
    if (payload.event === 'OnTabIdentify') {
      this.onTabIdentified(payload, puppetPageId);
    } else if (payload.event === 'OnPageVisible') {
      this.handlePageIsVisible(payload, puppetPageId);
    } else if (payload.event === 'OnWindowBounds') {
      this.onBoundsChanged(payload.windowBounds);
    }
  }

  private handlePageIsVisible(payload: any, puppetPageId: string): void {
    this.activePuppetPage = this.puppetPagesById.get(puppetPageId);
    ChromeAliveCore.changeActiveSessions(
      { active: true, focused: payload.focused },
      this.sessionId,
      puppetPageId,
    );
  }

  private onTabIdentified(
    payload: { windowId: number; tabId: number },
    puppetPageId: string,
  ): void {
    const { windowId, tabId } = payload;
    const puppetPage = this.puppetPagesById.get(puppetPageId);
    this.identityByPuppetPage.get(puppetPage).resolve({ windowId, tabId });
  }

  /// /// VIEWPORT FULL SCREEN /////////////////////////////////////////////////////////////////////////////////////////

  private onBoundsChanged(payload: IBounds & { windowId: number }): void {
    const { windowId, ...bounds } = payload;
    AliveBarPositioner.onChromeWindowBoundsChanged(this.sessionId, bounds);
  }

  private async setPageViewportToWindowBounds(page: IPuppetPage): Promise<void> {
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
}

interface IPageIdentity {
  tabId: number;
  windowId: number;
}
