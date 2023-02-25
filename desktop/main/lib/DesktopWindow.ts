import { BrowserWindow } from 'electron';
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
  'open-chromealive': { minerAddress: string; heroSessionId: string; dbPath: string };
}> {
  public get isOpen(): boolean {
    return !!this.#window;
  }

  public get isFocused(): boolean {
    return this.#window?.isFocused();
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
      ...this.#windowStateKeeper.windowState,
      webPreferences: {
        preload: `${__dirname}/MenubarPagePreload.js`,
      },
      icon: Path.resolve('..', 'assets', 'icon.png'),
    });

    this.#windowStateKeeper.track(this.#window);
    this.#window.setTitle('Ulixee Desktop');
    this.#events.on(this.#window.webContents, 'ipc-message', async (e, message, ...args) => {
      if (message === 'desktop:api') {
        const [api] = args;
        if (api === 'Desktop.publishConnections') {
          for (const [address, group] of this.apiManager.apiByMinerAddress) {
            if (group.isResolved && !group.resolved?.api) continue;
            await this.onNewMinerAddress({ newAddress: address });
          }
        }
        if (api === 'Session.openReplay') {
          this.emit('open-chromealive', ...args[1]);
        }
        if (api === 'Desktop.connectToMiner') {
          const { address } = args[1][0];
          if (!address) {
            console.warn('No valid address provided to connect to', args[1]);
            return;
          }
          await this.apiManager
            .connectToMiner(address)
            .catch(error =>
              this.sendDesktopEvent('Desktop.connectToMinerError', {
                message: error.message,
                address,
              }),
            );
        }
      }
    });
    this.#events.on(this.#window.webContents, 'context-menu', (e, params) => {
      generateContextMenu(params, this.#window.webContents).popup();
    });
    this.#events.once(this.#window, 'focus', this.emit.bind(this, 'focus'));
    this.#events.once(this.#window, 'close', this.close.bind(this));

    await this.#window.webContents.loadURL(this.#webpageUrl);
  }

  public close(): void {
    this.#events.close();
    this.#window = null;
    this.emit('close');
  }

  public async onNewMinerAddress(event: {
    newAddress: string;
    oldAddress?: string;
  }): Promise<void> {
    await this.sendDesktopEvent('Desktop.onRemoteConnected', event);
  }

  private sendDesktopEvent(eventType: string, data: any): Promise<any> {
    return this.#window.webContents.executeJavaScript(`(()=>{
      document.dispatchEvent(new CustomEvent('desktop:event', ${JSON.stringify({
        detail: { eventType, data },
      })}));
    })()`);
  }
}
