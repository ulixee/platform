import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import * as Path from 'path';
import Log from '@ulixee/commons/lib/Logger';
import ICorePluginCreateOptions from '@ulixee/hero-interfaces/ICorePluginCreateOptions';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import BridgeToExtension from './bridges/BridgeToExtension';
import WindowBoundsModule from './hero-plugin-modules/WindowBoundsModule';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import FocusedWindowModule from './hero-plugin-modules/FocusedWindowModule';
import { extensionId } from './ExtensionUtils';
import DevtoolsBackdoorModule from './hero-plugin-modules/DevtoolsBackdoorModule';
import ElementsModule from './hero-plugin-modules/ElementsModule';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import EventEmitter = require('events');
import { MessageLocation } from './BridgeHelpers';

// have to resolve an actual file
export const extensionPath = Path.resolve(__dirname, '../..', 'chromealive/extension').replace(
  'app.asar',
  'app.asar.unpacked',
); // make electron packaging friendly

export default class HeroCorePlugin extends CorePlugin {
  public static id = '@ulixee/chromealive-hero-core-plugin';

  private readonly bridgeToExtension: BridgeToExtension;

  private tabGroupModule: TabGroupModule;
  private windowBoundsModule: WindowBoundsModule;
  private focusedWindowModule: FocusedWindowModule;
  private DevtoolsBackdoorModule: DevtoolsBackdoorModule;
  private elementsModule: ElementsModule;
  private events = new EventSubscriber();
  private browserEmitter = new EventEmitter();

  constructor(createOptions: ICorePluginCreateOptions) {
    super(createOptions);
    this.bridgeToExtension = new BridgeToExtension();

    this.tabGroupModule = new TabGroupModule(this.bridgeToExtension, this.browserEmitter);
    this.windowBoundsModule = new WindowBoundsModule(this.bridgeToExtension, this.browserEmitter);
    this.focusedWindowModule = new FocusedWindowModule(this.bridgeToExtension, this.browserEmitter);
    this.elementsModule = new ElementsModule(this.bridgeToExtension);
    this.DevtoolsBackdoorModule = new DevtoolsBackdoorModule(this.tabGroupModule);

    this.events.on(this.bridgeToExtension, 'message', (message, messageComponents) => {
      const { destLocation, stringifiedMessage, puppetPageId } = messageComponents;
      if (destLocation === MessageLocation.Core) {
        const { payload } = JSON.parse(stringifiedMessage);
        this.browserEmitter.emit('payload', payload, puppetPageId);
      }
    });
  }

  async onNewPuppetContext(context: IPuppetContext, sessionSummary: ISessionSummary): Promise<any> {
    if (context.isIncognito || sessionSummary.options.showBrowser === false) return;

    this.events.once(context, 'close', this.onContextClosed.bind(this, sessionSummary));

    this.tabGroupModule.onNewPuppetContext(context, sessionSummary);
    this.elementsModule.onNewPuppetContext(context, sessionSummary);
    this.DevtoolsBackdoorModule.onNewPuppetContext(context, sessionSummary);

    const currentTargets = await context.sendWithBrowserDevtoolsSession('Target.getTargets');
    let hasBlankTab = false;
    for (const target of currentTargets.targetInfos) {
      if (target.type === 'page' && target.url === 'chrome://newtab/') {
        hasBlankTab = true;
      }
    }
    if (!hasBlankTab) await context.newPage({ runPageScripts: false });
  }

  public onBrowserLaunchConfiguration(launchArguments: string[]): void {
    if (launchArguments.includes('--headless')) return;

    launchArguments.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    );
  }

  public configure(options: IBrowserEmulatorConfig): Promise<any> | void {
    this.windowBoundsModule.configure(options);
  }

  public async onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (page.browserContext.isIncognito || sessionSummary.options.showBrowser === false) return;
    await Promise.all([
      this.bridgeToExtension.addPuppetPage(page, this.events),
      this.windowBoundsModule.onNewPuppetPage(page, sessionSummary),
      this.focusedWindowModule.onNewPuppetPage(page, sessionSummary, this.events),
      this.tabGroupModule.onNewPuppetPage(page),
      this.elementsModule.onNewPuppetPage(page, sessionSummary),
    ]);
  }

  public onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<any> {
    return Promise.all([
      this.DevtoolsBackdoorModule.onDevtoolsPanelAttached(devtoolsSession),
    ]);
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession): Promise<any> {
    return Promise.all([
      this.DevtoolsBackdoorModule.onDevtoolsPanelDetached(devtoolsSession),
    ]);
  }

  public onServiceWorkerAttached(
    devtoolsSession: IDevtoolsSession,
    event: Protocol.Target.AttachedToTargetEvent,
  ): Promise<any> {
    const { targetInfo } = event;
    if (targetInfo.url !== `chrome-extension://${extensionId}/background.js`) return;
  }

  public onContextClosed(sessionSummary: ISessionSummary): void {
    this.tabGroupModule.close();
    this.DevtoolsBackdoorModule.close(sessionSummary);
    this.events.close();
    this.browserEmitter.removeAllListeners();
  }
}
