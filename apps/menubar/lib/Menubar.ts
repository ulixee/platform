import { app, systemPreferences, BrowserWindow, Tray } from 'electron';
import { EventEmitter } from 'events';
import * as Positioner from 'electron-positioner';
import { NSEventMonitor, NSEventMask } from 'nseventmonitor';
import IMenubarOptions from '../interfaces/IMenubarOptions';
import { getWindowPosition } from './util/getWindowPosition';
import VueServer from './VueServer';

// Forked from https://github.com/maxogden/menubar

export class Menubar extends EventEmitter {
  #tray?: Tray;
  #browserWindow?: BrowserWindow;
  #blurTimeout: NodeJS.Timeout | null = null; // track blur events with timeout
  #isVisible: boolean; // track visibility
  #cachedBounds?: Electron.Rectangle; // _cachedBounds are needed for double-clicked event
  #options: IMenubarOptions;
  #positioner: Positioner | undefined;
  #macEventMonitor = new NSEventMonitor();
  #vueServer: VueServer;

  constructor(options?: IMenubarOptions) {
    super();
    this.#options = options;
    this.#isVisible = false;

    if (app.isReady()) {
      // See https://github.com/maxogden/menubar/pull/151
      process.nextTick(() => this.appReady());
    } else {
      app.on('ready', () => this.appReady());
    }

    this.#macEventMonitor.start(NSEventMask.leftMouseDown | NSEventMask.rightMouseDown, () => {
      this.hideWindow();
    });

    this.#vueServer = new VueServer(options.vueDistPath);
  }

  get tray(): Tray {
    if (!this.#tray) throw new Error('Please access `this.tray` after the `ready` event has fired.');
    return this.#tray;
  }

  private hideWindow(): void {
    if (!this.#browserWindow || !this.#isVisible) {
      return;
    }
    this.#browserWindow.hide();
    this.#isVisible = false;
    if (this.#blurTimeout) {
      clearTimeout(this.#blurTimeout);
      this.#blurTimeout = null;
    }
  }

  private async showWindow(trayPos?: Electron.Rectangle): Promise<void> {
    if (!this.#tray) {
      throw new Error('Tray should have been instantiated by now');
    }

    if (!this.#browserWindow) {
      await this.createWindow();
    }

    // Use guard for TypeScript, to avoid ! everywhere
    if (!this.#browserWindow) {
      throw new Error('Window has been initialized just above. qed.');
    }

    // 'Windows' taskbar: sync windows position each time before showing
    // https://github.com/maxogden/menubar/issues/232
    if (['win32', 'linux'].includes(process.platform)) {
      // Fill in this.#options.windowPosition when taskbar position is available
      this.#options.windowPosition = getWindowPosition(this.#tray);
    }

    if (trayPos && trayPos.x !== 0) {
      // Cache the bounds
      this.#cachedBounds = trayPos;
    } else if (this.#cachedBounds) {
      // Cached value will be used if showWindow is called without bounds data
      trayPos = this.#cachedBounds;
    } else if (this.#tray.getBounds) {
      // Get the current tray bounds
      trayPos = this.#tray.getBounds();
    }

    // Default the window to the right if `trayPos` bounds are undefined or null.
    let noBoundsPosition;
    if (
      (trayPos === undefined || trayPos.x === 0) &&
      this.#options.windowPosition &&
      this.#options.windowPosition.startsWith('tray')
    ) {
      noBoundsPosition = process.platform === 'win32' ? 'bottomRight' : 'topRight';
    }

    const position = this.#positioner.calculate(
      this.#options.windowPosition || noBoundsPosition,
      trayPos,
    ) as { x: number; y: number };

    const x = position.x;
    const y = position.y;

    // `.setPosition` crashed on non-integers
    // https://github.com/maxogden/menubar/issues/233
    this.#browserWindow.setPosition(Math.round(x), Math.round(y));
    this.#browserWindow.show();
    this.#isVisible = true;
  }

  private appReady(): void {
    try {
      this.#tray = new Tray(this.#options.iconPath);

      app.on('activate', (_event, hasVisibleWindows) => {
        if (!hasVisibleWindows) {
          this.showWindow().catch(console.error);
        }
      });

      this.#tray.on('click', this.clicked.bind(this));
      this.#tray.on('right-click', this.clicked.bind(this));
      this.#tray.on('double-click', this.clicked.bind(this));
      this.#tray.setToolTip(this.#options.tooltip || '');

      if (!this.#options.windowPosition) {
        // Fill in this.#options.windowPosition when taskbar position is available
        this.#options.windowPosition = getWindowPosition(this.#tray);
      }

      this.emit('ready');
    } catch(error) {
      console.log('ERROR in appReady: ', error);
    }
  }

  private async clicked(
    event?: Electron.KeyboardEvent,
    bounds?: Electron.Rectangle,
  ): Promise<void> {
    if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      return this.hideWindow();
    }

    // if blur was invoked clear timeout
    if (this.#blurTimeout) {
      clearInterval(this.#blurTimeout);
    }

    if (this.#browserWindow && this.#isVisible) {
      return this.hideWindow();
    }

    this.#cachedBounds = bounds || this.#cachedBounds;
    await this.showWindow(this.#cachedBounds);
  }

  private async createWindow(): Promise<void> {
    const defaults = {
      show: false, // Don't show it at first
      frame: false, // Remove window frame
      width: this.#options.width,
      height: this.#options.height,
    };

    this.#browserWindow = new BrowserWindow({
      ...defaults,
      roundedCorners: false,
      transparent: true,
    });

    this.#positioner = new Positioner(this.#browserWindow);

    this.#browserWindow.on('blur', () => {
      if (!this.#browserWindow) {
        return;
      }
      this.#blurTimeout = setTimeout(() => this.hideWindow(), 100);
    });

    this.#browserWindow.setVisibleOnAllWorkspaces(true);
    this.#browserWindow.on('close', this.windowClear.bind(this));

    const port = await this.#vueServer.port;
    const windowBackground = systemPreferences.getColor('window-background').replace('#', '');
    const url = `http://localhost:${port}/?windowBackground=${windowBackground}`;
    await this.#browserWindow.loadURL(url);
  }

  private windowClear(): void {
    this.#browserWindow = undefined;
  }
}
