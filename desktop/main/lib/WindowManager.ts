import { app, dialog, ipcMain, Menu } from 'electron';
import * as Path from 'path';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import * as Os from 'os';
import IRegisteredEventListener from '@ulixee/commons/interfaces/IRegisteredEventListener';
import { INewHeroSessionEvent } from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import ChromeAliveWindow from './ChromeAliveWindow';
import { Menubar } from './Menubar';
import ApiManager from './ApiManager';
import DesktopWindow from './DesktopWindow';
import generateAppMenu from '../menus/generateAppMenu';

export class WindowManager {
  get activeChromeAliveWindow(): ChromeAliveWindow {
    return this.chromeAliveWindows[this.activeChromeAliveWindowIdx];
  }

  chromeAliveWindows: ChromeAliveWindow[] = [];
  activeChromeAliveWindowIdx = 0;
  readonly desktopWindow: DesktopWindow;
  events = new EventSubscriber();

  #chromeAliveWindowsBySessionId = new Map<string, ChromeAliveWindow>();

  constructor(private menuBar: Menubar, private apiManager: ApiManager) {
    this.events.on(apiManager, 'new-miner-address', this.onNewMinerAddress.bind(this));
    this.events.on(apiManager, 'api-event', this.onApiEvent.bind(this));

    this.bindIpcEvents();
    this.desktopWindow = new DesktopWindow(menuBar.staticServer, apiManager);
    this.desktopWindow.on('close', this.checkOpenWindows.bind(this));
    this.desktopWindow.on('focus', this.setMenu.bind(this));
    this.desktopWindow.on('open-chromealive', this.loadChromeAliveWindow.bind(this));
  }

  public async openDesktop(): Promise<void> {
    await app.dock?.show();
    this.setMenu();
    await this.desktopWindow.open();
  }

  public close(): void {
    this.events.close();
  }

  public async loadChromeAliveWindow(data: {
    minerAddress: string;
    heroSessionId: string;
    dbPath: string;
  }): Promise<void> {
    if (this.#chromeAliveWindowsBySessionId.has(data.heroSessionId)) {
      this.#chromeAliveWindowsBySessionId.get(data.heroSessionId).window.focus();
      return;
    }
    await app.dock?.show();
    const chromeAliveWindow = new ChromeAliveWindow(
      data,
      this.menuBar.staticServer,
      data.minerAddress,
    );

    const { heroSessionId } = data;
    this.chromeAliveWindows.push(chromeAliveWindow);
    this.#chromeAliveWindowsBySessionId.set(heroSessionId, chromeAliveWindow);
    await chromeAliveWindow
      .load()
      .catch(err => console.error('Error Loading ChromeAlive window', err));

    const focusEvent = this.events.on(
      chromeAliveWindow.window,
      'focus',
      this.focusWindow.bind(this, heroSessionId),
    );
    this.events.once(
      chromeAliveWindow.window,
      'close',
      this.closeWindow.bind(this, heroSessionId, focusEvent),
    );
    this.setMenu();
  }

  public async pickHeroSession(): Promise<void> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      defaultPath: Path.join(Os.tmpdir(), '.ulixee', 'hero-sessions'),
      filters: [
        // { name: 'All Files', extensions: ['js', 'ts', 'db'] },
        { name: 'Session Database', extensions: ['db'] },
        // { name: 'Javascript', extensions: ['js'] },
        // { name: 'Typescript', extensions: ['ts'] },
      ],
    });
    if (result.filePaths.length) {
      const [filename] = result.filePaths;
      if (filename.endsWith('.db')) {
        return this.loadChromeAliveWindow({
          minerAddress: this.apiManager.localMinerAddress,
          dbPath: filename,
          heroSessionId: Path.basename(filename).replace('.db', ''),
        });
      }
      // const sessionContainerDir = Path.dirname(filename);
      // TODO: show relevant sessions
    }
  }

  private setMenu(): void {
    if (this.desktopWindow.isFocused) {
      Menu.setApplicationMenu(generateAppMenu(null));
    } else {
      Menu.setApplicationMenu(generateAppMenu(this.activeChromeAliveWindow));
    }
  }

  private onApiEvent(event: ApiManager['EventTypes']['api-event']): void {
    if (event.eventType === 'Session.opened') {
      void this.loadChromeAliveWindow({
        ...(event.data as INewHeroSessionEvent),
        minerAddress: event.minerAddress,
      });
    }
  }

  private async onNewMinerAddress(
    event: ApiManager['EventTypes']['new-miner-address'],
  ): Promise<void> {
    const { oldAddress, newAddress } = event;
    await this.desktopWindow.onNewMinerAddress(event);
    if (!oldAddress) return;

    for (const window of this.chromeAliveWindows) {
      if (window.api.address.startsWith(oldAddress)) {
        await window.reconnect(newAddress);
      }
    }
  }

  private bindIpcEvents(): void {
    ipcMain.on('open-file', this.pickHeroSession.bind(this));
  }

  private closeWindow(
    heroSessionId: string,
    ...eventsToUnregister: IRegisteredEventListener[]
  ): void {
    const chromeAliveWindow = this.#chromeAliveWindowsBySessionId.get(heroSessionId);
    if (!chromeAliveWindow) return;
    this.#chromeAliveWindowsBySessionId.delete(heroSessionId);
    this.events.off(...eventsToUnregister);
    const idx = this.chromeAliveWindows.indexOf(chromeAliveWindow);
    if (idx === this.activeChromeAliveWindowIdx) {
      this.activeChromeAliveWindowIdx = 0;
    }
    this.chromeAliveWindows.splice(idx, 1);
    this.checkOpenWindows();
    this.setMenu();
  }

  private checkOpenWindows(): void {
    if (this.chromeAliveWindows.length === 0 && !this.desktopWindow.isOpen) {
      app.dock?.hide();
    }
  }

  private focusWindow(heroSessionId: string): void {
    const chromeAliveWindow = this.#chromeAliveWindowsBySessionId.get(heroSessionId);
    if (chromeAliveWindow)
      this.activeChromeAliveWindowIdx = this.chromeAliveWindows.indexOf(chromeAliveWindow);
    this.setMenu();
  }
}
