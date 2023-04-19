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
    return !!this.#window;
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
    this.#window.focus();
  }

  public async open(show = true): Promise<void> {
    if (this.#window) {
      if (show) this.#window.show();
      this.#window.focus();
      return;
    }
    this.#window = new BrowserWindow({
      show,
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
    this.#events.once(this.#window, 'focus', this.emit.bind(this, 'focus'));
    this.#events.once(this.#window, 'close', this.close.bind(this));

    await this.#window.webContents.loadURL(this.#webpageUrl);

    this.#window.focus();
  }

  public close(): void {
    this.#events.close();
    this.#window = null;
    this.emit('close');
  }
}
