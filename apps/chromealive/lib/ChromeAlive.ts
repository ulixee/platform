import { app } from 'electron';
import { EventEmitter } from 'events';
import { Server as StaticServer } from 'node-static';
import * as Http from 'http';
import { AddressInfo } from 'net';
import * as Path from 'path';
import * as Fs from 'fs';
import * as ContextMenu from 'electron-context-menu';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import ChromeAliveApi from './ChromeAliveApi';
import IAppMoveEvent from '@ulixee/apps-chromealive-interfaces/events/IAppMoveEvent';
import ToolbarWindow from './ToolbarWindow';
import TimelineWindow from './TimelineWindow';

export class ChromeAlive extends EventEmitter {
  readonly #vueServer: Http.Server;
  #timelineWindow: TimelineWindow;
  #toolbarWindow: ToolbarWindow;

  #hideOnLaunch = false;
  #nsEventMonitor: any;
  #mouseDown: boolean;
  #exited = false;

  vueAddress: Promise<AddressInfo>;
  api: ChromeAliveApi;

  constructor(readonly coreServerAddress?: string) {
    super();
    this.coreServerAddress ??= process.argv
      .find(x => x.startsWith('--coreServerAddress='))
      ?.replace('--coreServerAddress=', '');

    this.#hideOnLaunch = process.argv.some(x => x === '--hide');

    // hide the dock icon if it shows
    if (process.platform === 'darwin') {
      app.setActivationPolicy('accessory');
    }
    this.api = new ChromeAliveApi(this.coreServerAddress, this.onChromeAliveEvent.bind(this));

    ContextMenu({
      showInspectElement: true,
      showSearchWithGoogle: false,
      showLookUpSelection: false,
    });
    app.name = 'ChromeAlive!';

    app.setAppLogsPath();

    if (app.isReady()) {
      process.nextTick(() => this.appReady());
    } else {
      app.on('ready', () => this.appReady());
    }

    const vueDistPath = Path.resolve(__dirname, '..', 'ui');
    if (!Fs.existsSync(vueDistPath)) throw new Error('ChromeAlive UI not installed');

    const staticServer = new StaticServer(vueDistPath);

    this.#vueServer = Http.createServer((req, res) => {
      staticServer.serve(req, res);
    });

    this.vueAddress = new Promise<AddressInfo>((resolve, reject) => {
      this.#vueServer.once('error', reject);
      this.#vueServer.listen({ port: 0 }, () => {
        this.#vueServer.off('error', reject);
        resolve(this.#vueServer.address() as AddressInfo);
      });
    });
  }

  public onChromeAliveEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T],
  ): void {
    if (eventType === 'App.startedDraggingChrome') {
      this.#timelineWindow.hideWindow();
      this.#toolbarWindow.toggleOnTop(true);
    }
    if (eventType === 'App.stoppedDraggingChrome') {
      this.#timelineWindow.showWindow(true);
      this.#toolbarWindow.toggleOnTop(true);
    }
    if (eventType === 'App.show') {
      const onTop = (data as any).onTop ?? true;
      this.#timelineWindow.showWindow(onTop);
      this.#toolbarWindow.showWindow(onTop);
    }
    if (eventType === 'App.hide') {
      this.#timelineWindow.hideWindow();
      this.#toolbarWindow.hideWindow();
    }
    if (eventType === 'App.quit') app.exit();
    if (eventType === 'App.move') this.#timelineWindow.moveWindow(data as IAppMoveEvent);
  }

  private appExit(): void {
    if (this.#exited) return;
    this.#exited = true;

    console.warn('EXITING CHROMEALIVE!');
    app.exit();
    this.#nsEventMonitor?.stop();
  }

  private async appReady(): Promise<void> {
    try {
      await this.api.connect();

      this.#timelineWindow = new TimelineWindow(this);
      this.#toolbarWindow = new ToolbarWindow(this);

      await Promise.all([
        this.#timelineWindow.activate(),
        this.#toolbarWindow.activate(),
      ]);
      this.listenForMouseDown();
      ShutdownHandler.register(() => this.appExit());

      this.emit('ready');
    } catch (error) {
      console.error('ERROR in appReady: ', error);
    }
  }

  private listenForMouseDown() {
    // TODO: add linux/win support
    // https://github.com/wilix-team/iohook (seems unstable, but possibly look at ideas?)
    // windows: https://github.com/xanderfrangos/global-mouse-events

    if (process.platform !== 'darwin' || this.#nsEventMonitor) return;

    // eslint-disable-next-line import/no-unresolved,global-require
    const { NSEventMonitor, NSEventMask } = require('nseventmonitor') as any;

    // https://developer.apple.com/documentation/appkit/nsevent/eventtype/leftmousedown
    enum NSEventType {
      LeftMouseDown = 1,
      LeftMouseUp = 2,
    }

    const monitor = new NSEventMonitor();
    monitor.start(
      NSEventMask.mouseEntered | NSEventMask.leftMouseDown | NSEventMask.leftMouseUp,
      ev => {
        this.#mouseDown = ev.type === NSEventType.LeftMouseDown;
        return this.api.send('Mouse.state', { isMousedown: this.#mouseDown });
      },
    );
    this.#nsEventMonitor = monitor;
  }
}
