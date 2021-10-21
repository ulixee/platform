import * as Path from 'path';
import { EventEmitter } from 'events';
import ICorePluginCreateOptions from '@ulixee/hero-interfaces/ICorePluginCreateOptions';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import BridgeToDevtoolsPrivate from './bridges/BridgeToDevtoolsPrivate';
import BridgeToExtension from './bridges/BridgeToExtension';
import WindowBoundsModule from './hero-plugin-modules/WindowBoundsModule';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import FocusedWindowModule from './hero-plugin-modules/FocusedWindowModule';
import { MessageLocation } from './BridgeHelpers';

// have to resolve an actual file
const extensionPath = Path.resolve(__dirname, '../..', 'chromealive/extension').replace(
  'app.asar',
  'app.asar.unpacked',
); // make electron packaging friendly

export default class HeroCorePlugin extends CorePlugin {
  public static id = '@ulixee/chromealive-hero-core-plugin';

  private readonly bridgeToExtension: BridgeToExtension;
  private readonly bridgeToDevtoolsPrivate: BridgeToDevtoolsPrivate;

  private tabGroupModule: TabGroupModule;
  private windowBoundsModule: WindowBoundsModule;
  private focusedWindowModule: FocusedWindowModule;

  constructor(createOptions: ICorePluginCreateOptions) {
    super(createOptions);
    this.bridgeToExtension = new BridgeToExtension();
    this.bridgeToDevtoolsPrivate = new BridgeToDevtoolsPrivate();

    const browserEmitter = new EventEmitter();
    this.tabGroupModule = new TabGroupModule(this.bridgeToExtension, browserEmitter);
    this.windowBoundsModule = new WindowBoundsModule(this.bridgeToExtension);
    this.focusedWindowModule = new FocusedWindowModule(this.bridgeToExtension);

    this.bridgeToDevtoolsPrivate.on('message', (message, { destLocation }) => {
      const { ContentScript, BackgroundScript } = MessageLocation;
      if ([ContentScript, BackgroundScript].includes(destLocation)) {
        this.bridgeToExtension.send(message);
      }
    });

    this.bridgeToExtension.on('message', (message, { destLocation, pageId }) => {
      if (destLocation === MessageLocation.DevtoolsPrivate) {
        this.bridgeToDevtoolsPrivate.send(message);
      } else if (destLocation === MessageLocation.Core) {
        browserEmitter.emit('message', message, { pageId });
      }
    });
  }

  onBrowserLaunchConfiguration(launchArguments: string[]): void {
    launchArguments.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    );
  }

  configure(options: IBrowserEmulatorConfig): Promise<any> | void {
    this.windowBoundsModule.configure(options);
  }

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;
    this.bridgeToExtension.addPuppetPage(page);
    this.windowBoundsModule.onNewPuppetPage(page, sessionSummary);
  }

  onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<any> {
    return this.bridgeToDevtoolsPrivate.addDevtoolsSession(devtoolsSession);
  }

  // onServiceWorkerAttached(devtoolsSession: IDevtoolsSession, event): Promise<any> {
  //   const { targetInfo } = event;
  //   if (targetInfo.url !== `chrome-extension://${extensionId}/background.js`) return;
  //   return this.bridgeToExtensionBackground.addDevtoolsSession(devtoolsSession);
  // }
}
