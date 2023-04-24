import { BrowserWindow, WebContents } from 'electron';
import * as Path from 'path';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import StaticServer from './StaticServer';
import ApiManager from './ApiManager';
import generateContextMenu from '../menus/generateContextMenu';
import WindowStateKeeper from './util/windowStateKeeper';

export default class DesktopWindow extends TypedEventEmitter<{
  close: void;
  focus: void;
}> {
  public get isOpen(): boolean {
    return this.#window?.isVisible() === true;
  }

  public get isFocused(): boolean {
    return this.#window?.isFocused();
  }

  public get webContents(): WebContents {
    return this.#window?.webContents;
  }

  #window: BrowserWindow;
  #events = new EventSubscriber();

  #webpageUrl: string;
  #windowStateKeeper = new WindowStateKeeper('DesktopWindow');

  constructor(staticServer: StaticServer, private apiManager: ApiManager) {
    super();
    this.#webpageUrl = staticServer.getPath('desktop.html');
    void this.open(false);
  }

  public focus(): void {
    this.#window.moveTop();
  }

  public async open(show = true): Promise<void> {
    if (this.#window) {
      if (show) {
        this.#window.setAlwaysOnTop(true);
        this.#window.show();
        this.#window.setAlwaysOnTop(false);
      }
      return;
    }
    this.#window = new BrowserWindow({
      show: false,
      acceptFirstMouse: true,
      useContentSize: true,
      titleBarStyle: 'hiddenInset',
      ...this.#windowStateKeeper.windowState,
      webPreferences: {
        preload: `${__dirname}/DesktopPagePreload.js`,
      },
      icon: Path.resolve('..', 'assets', 'icon.png'),
    });

    this.#windowStateKeeper.track(this.#window);
    this.#window.setTitle('Ulixee Desktop');

    this.#window.webContents.ipc.handle('desktop:api', async (e, { api, args }) => {
      if (api === 'Credit.dragAsFile') {
        return await this.apiManager.privateDesktopApiHandler.dragCreditAsFile(args, e.sender);
      }
    });
    this.#window.webContents.ipc.on('getPrivateApiHost', e => {
      e.returnValue = this.apiManager.privateDesktopWsServerAddress;
    });

    this.#events.on(this.#window.webContents, 'context-menu', (e, params) => {
      generateContextMenu(params, this.#window.webContents).popup();
    });
    this.#events.on(this.#window, 'focus', this.emit.bind(this, 'focus'));
    this.#events.on(this.#window, 'close', this.close.bind(this));

    await this.#window.webContents.loadURL(this.#webpageUrl);

    if (show) {
      this.#window.show();
      this.#window.moveTop();
    }
  }

  public close(e, force = false): void {
    if (force) {
      this.#events.close();
      this.#window = null;
    } else {
      this.#window.hide();
      e.preventDefault();
    }
    this.emit('close');
  }
}
