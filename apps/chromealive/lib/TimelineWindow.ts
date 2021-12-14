import { app, BrowserWindow, screen } from 'electron';
import IAppMoveEvent from '../../chromealive-interfaces/events/IAppMoveEvent';
import { ChromeAlive } from './ChromeAlive';
import injectCoreServer from './WindowUtils';

export default class TimelineWindow {
  #timelineWindow: BrowserWindow;
  #timelineIsVisible: boolean; // track visibility
  #chromeAlive: ChromeAlive;

  constructor(chromeAlive: ChromeAlive) {
    this.#chromeAlive = chromeAlive;
    this.#timelineIsVisible = false;
  }

  public async activate(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workarea = mainScreen.workArea;

    this.#timelineWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      movable: false,
      closable: false,
      transparent: true,
      acceptFirstMouse: true,
      hasShadow: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      width: workarea.width,
      y: workarea.y,
      x: workarea.x,
      webPreferences: {
        preload: `${__dirname}/PagePreload.js`,
        nativeWindowOpen: true,
        enableRemoteModule: true,
      },
      height: 50,
    });

    this.bindListeners();

    const port = (await this.#chromeAlive.vueAddress).port;
    await this.#timelineWindow.loadURL(`http://localhost:${port}/timeline.html`);
    await injectCoreServer(this.#timelineWindow, this.#chromeAlive.coreServerAddress);

    const workareaBounds = { left: workarea.x, top: workarea.y, ...workarea };
    await this.#chromeAlive.api.send('App.ready', { workarea: workareaBounds });
  }

  public moveWindow(move: IAppMoveEvent): void {
    const bounds = this.#timelineWindow.getBounds();
    if (bounds.x !== move.bounds.x || bounds.y !== move.bounds.y) {
      this.#timelineWindow.setPosition(move.bounds.x, move.bounds.y);
    }
    if (bounds.width !== move.bounds.width) {
      bounds.width = move.bounds.width;
      this.#timelineWindow.setBounds(bounds);
    }
  }

  public hideWindow(): void {
    if (!this.#timelineIsVisible) {
      return;
    }

    this.#timelineWindow.hide();
    this.#timelineIsVisible = false;
  }

  public showWindow(onTop: boolean): void {
    if (!this.#timelineWindow.isVisible()) {
      this.#timelineWindow.show();
    }
    this.toggleTimelineOnTop(onTop);
    this.#timelineIsVisible = true;
  }

  private toggleTimelineOnTop(onTop: boolean) {
    this.#timelineWindow.setAlwaysOnTop(onTop);
  }

  private bindListeners() {
    this.#timelineWindow.on('close', () => app.exit());
    this.#timelineWindow.webContents.on('ipc-message', (e, message, ...args) => {
      if (message === 'mousemove') {
        // move back to top
        if (this.#timelineIsVisible && this.#timelineWindow.isAlwaysOnTop()) {
          this.toggleTimelineOnTop(true);
        }
      }
      if (message === 'timeline:resize-height') {
        this.#timelineWindow.setBounds({
          height: args[0],
        });
      }
      if (message === 'chromealive:event') {
        const [eventType, data] = args;
        this.#chromeAlive.onChromeAliveEvent(eventType, data);
      }
    });
  }
}
