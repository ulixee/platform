import * as Path from 'path';
import { EventEmitter } from 'events';
import Log from '@ulixee/commons/lib/Logger';
import ICorePluginCreateOptions from '@ulixee/hero-interfaces/ICorePluginCreateOptions';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { IBrowserEmulatorConfig, ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import BridgeToDevtoolsPrivate from './bridges/BridgeToDevtoolsPrivate';
import BridgeToExtension from './bridges/BridgeToExtension';
import WindowBoundsModule from './hero-plugin-modules/WindowBoundsModule';
import TabGroupModule from './hero-plugin-modules/TabGroupModule';
import FocusedWindowModule from './hero-plugin-modules/FocusedWindowModule';
import { MessageLocation } from './BridgeHelpers';
import { extensionId } from './ExtensionUtils';
import DevtoolsPanelModule from './hero-plugin-modules/DevtoolsPanelModule';

const { log } = Log(module);

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
  private devtoolsPanelModule: DevtoolsPanelModule;

  constructor(createOptions: ICorePluginCreateOptions) {
    super(createOptions);
    this.bridgeToExtension = new BridgeToExtension();
    this.bridgeToDevtoolsPrivate = new BridgeToDevtoolsPrivate();

    const browserEmitter = new EventEmitter();
    this.tabGroupModule = new TabGroupModule(this.bridgeToExtension, browserEmitter);
    this.windowBoundsModule = new WindowBoundsModule(this.bridgeToExtension, browserEmitter);
    this.focusedWindowModule = new FocusedWindowModule(this.bridgeToExtension, browserEmitter);
    this.devtoolsPanelModule = new DevtoolsPanelModule(
      this.bridgeToDevtoolsPrivate,
      this.tabGroupModule.identityByPageId,
    );

    this.bridgeToDevtoolsPrivate.on('message', (message, { destLocation }) => {
      const { ContentScript, BackgroundScript } = MessageLocation;
      if ([ContentScript, BackgroundScript].includes(destLocation)) {
        this.bridgeToExtension.send(message).catch(error => {
          log.error('BridgeToDevtoolsMessageError', {
            error,
            sessionId: null,
          });
        });
      }
    });

    this.bridgeToExtension.on('message', (message, messageComponents) => {
      const { destLocation, stringifiedMessage, puppetPageId } = messageComponents;
      if (destLocation === MessageLocation.DevtoolsPrivate) {
        this.bridgeToDevtoolsPrivate.send(message).catch(error =>
          this.logger.error('Error sending message to DevtoolsPrivate', {
            error,
            message,
          }),
        );
      } else if (destLocation === MessageLocation.Core) {
        const { payload } = JSON.parse(stringifiedMessage);
        browserEmitter.emit('payload', payload, puppetPageId);
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

  async onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser && sessionSummary.options.mode !== 'timetravel') return;
    await Promise.all([
      this.bridgeToExtension.addPuppetPage(page),
      this.windowBoundsModule.onNewPuppetPage(page, sessionSummary),
      this.focusedWindowModule.onNewPuppetPage(page, sessionSummary),
      this.tabGroupModule.onNewPuppetPage(page, sessionSummary),
      this.devtoolsPanelModule.onNewPuppetPage(page, sessionSummary),
    ]);
  }

  onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<any> {
    return this.bridgeToDevtoolsPrivate.addDevtoolsSession(devtoolsSession);
  }

  onServiceWorkerAttached(
    devtoolsSession: IDevtoolsSession,
    event: Protocol.Target.AttachedToTargetEvent,
  ): Promise<any> {
    const { targetInfo } = event;
    if (targetInfo.url !== `chrome-extension://${extensionId}/background.js`) return;
  }
}
