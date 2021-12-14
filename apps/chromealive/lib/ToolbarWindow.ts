import { BrowserWindow, screen } from 'electron';
import { ChromeAlive } from './ChromeAlive';
import injectCoreServer from './WindowUtils';

export default class ToolbarWindow {
  #mainWindow: BrowserWindow;
  #alertWindow: BrowserWindow;
  #alertOffsets: IChildOffsets = {};
  #panelWindow: BrowserWindow;
  #panelOffsets: IChildOffsets = {};
  #isVisible: boolean;
  #chromeAlive: ChromeAlive;
  #width: number | 'maximized' | 'minimized' = 'maximized';

  #isDraggingPanel = false;
  #isDraggingPanelTimeout: any;
  #isDocked: boolean;
  #isLeft: boolean;

  constructor(chromeAlive: ChromeAlive) {
    this.#chromeAlive = chromeAlive;
  }

  public hideWindow(): void {
    if (!this.#isVisible) {
      return;
    }

    this.#mainWindow.hide();
    this.#alertWindow?.hide();
    this.#panelWindow?.hide();

    this.#isVisible = false;
  }

  public toggleOnTop(onTop: boolean) {
    if (this.#mainWindow.isAlwaysOnTop() !== onTop) {
      this.#mainWindow.setAlwaysOnTop(onTop, 'floating');
    }

    this.#alertWindow?.setAlwaysOnTop(onTop, 'floating');
    this.#panelWindow?.setAlwaysOnTop(onTop, 'floating');
  }

  public showWindow(onTop: boolean): void {
    if (!this.#mainWindow.isVisible()) {
      this.#mainWindow.show();
      this.#alertWindow?.show();
      this.#panelWindow?.show();
    }
    this.toggleOnTop(onTop);
    this.#isVisible = true;
  }

  public async activate(): Promise<void> {
    const mainScreen = screen.getPrimaryDisplay();
    const workArea = mainScreen.workArea;
    const initialBounds = {
      y: workArea.y + 50 + 200,
      x: workArea.x,
      width: this.convertToNumberWidth(this.#width),
      height: 351,
    }
    this.#mainWindow = new BrowserWindow({
      show: false,
      frame: false,
      roundedCorners: false,
      movable: true,
      resizable: false,
      closable: false,
      transparent: true,
      acceptFirstMouse: true,
      hasShadow: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      width: this.convertToFinalWidth(this.#width, initialBounds),
      height: initialBounds.height,
      y: initialBounds.y,
      x: initialBounds.x,
      webPreferences: {
        preload: `${__dirname}/PagePreload.js`,
        nativeWindowOpen: true,
        enableRemoteModule: true,
      },
    });

    this.#mainWindow.excludedFromShownWindowsMenu = true;

    this.bindMoveListener();

    this.trackChildWindows();
    this.handleIpcMessages();

    const port = (await this.#chromeAlive.vueAddress).port;
    await this.#mainWindow.loadURL(`http://localhost:${port}/toolbar.html`);

    this.positionChildWindows();
    await injectCoreServer(this.#mainWindow, this.#chromeAlive.coreServerAddress);
  }

  private handleIpcMessages() {
    this.#mainWindow.webContents.on('ipc-message', (e, message, ...args) => {
      if (message === 'mousemove') {
        if (this.#isVisible) {
          this.#mainWindow.show();
        }
      } else if (message === 'chromealive:event') {
        const [eventType, data] = args;
        this.#chromeAlive.onChromeAliveEvent(eventType, data);
      } else if (message === 'toolbar:resize-width') {
        const bounds = this.#mainWindow.getBounds();
        this.#width = args[0];
        this.#mainWindow.setBounds({ width: this.convertToFinalWidth(this.#width, bounds) });
        this.positionChildWindows();
      } else if (message === 'toolbar:closePopupAlert') {
        this.closeChildWindow('PopupAlert');
      } else if (message === 'toolbar:setAlertContentHeight') {
        this.setAlertContentHeight(args[0]);
      } else {
        console.log('Uncaught IPC Message: ', message);
      }
    });
  }

  private setAlertContentHeight(height: number) {
    this.#alertWindow.setBounds({ height: height + 17 });
  }

  private calculateIsDocked(bounds: Electron.Rectangle): boolean {
    if (bounds.x <= 15) return true;

    const primaryScreen = screen.getPrimaryDisplay();
    const screenWidth = primaryScreen.size.width;
    const windowRight = bounds.x + bounds.width;
    if (screenWidth - windowRight <= 15) return true;

    return false;
  }

  private convertToNumberWidth(width: number | 'maximized' | 'minimized'): number {
    if (width === 'maximized') return 200;
    if (width === 'minimized') return 55;
    return width as number;
  }

  private convertToFinalWidth(width: number | 'maximized' | 'minimized', bounds: Electron.Rectangle): number {
    width = this.convertToNumberWidth(width);
    return this.calculateIsDocked(bounds) ? width : width + 8;
  }

  private bindMoveListener() {
    this.#mainWindow.on('move', () => this.positionChildWindows());
  }

  private bindMovePanelListener() {
    this.#panelWindow.on('move', () => this.positionParentWindow());
  }

  private positionParentWindow() {
    const bounds = this.#panelWindow.getBounds();
    const y = bounds.y;

    let x: number;
    if (this.#isLeft) {
      x = bounds.x - this.#panelOffsets.x;
    } else {
      x = bounds.x + bounds.width - 9;
    }

    this.#isDraggingPanel = true;
    if (this.#isDraggingPanelTimeout) clearTimeout(this.#isDraggingPanelTimeout);
    this.#isDraggingPanelTimeout = null;
    this.#mainWindow.setBounds({ x, y });
    this.#isDraggingPanelTimeout = setTimeout(() => this.#isDraggingPanel = false, 100);
  }

  private positionChildWindows() {
    if (this.#isDraggingPanel) return;
    const bounds = this.#mainWindow.getBounds();
    const primaryScreen = screen.getPrimaryDisplay();
    const screenWidth = primaryScreen.size.width;
    const screenMiddleX = screenWidth / 2;
    const windowMiddleX = bounds.x + (bounds.width / 2);
    const isLeft = windowMiddleX < screenMiddleX;
    const isDocked = this.calculateIsDocked(bounds);

    const mainClasses = { add: [], remove: [] };
    const childClasses = { add: [], remove: [] };

    if (isLeft !== this.#isLeft) {
      if (isLeft) {
        mainClasses.add.push('left');
        mainClasses.remove.push('right');
        childClasses.add.push('right');
        childClasses.remove.push('left');
      } else {
        mainClasses.add.push('right');
        mainClasses.remove.push('left');
        childClasses.add.push('left');
        childClasses.remove.push('right');
      }
    }

    if (isDocked !== this.#isDocked) {
      if (isDocked) {
        mainClasses.add.push('docked');
        mainClasses.remove.push('floating');
      } else {
        mainClasses.add.push('floating');
        mainClasses.remove.push('docked');
      }
    }

    this.setBodyClass(this.#mainWindow, mainClasses);
    this.setBodyClass(this.#alertWindow, childClasses);
    this.setBodyClass(this.#panelWindow, childClasses);

    if (isDocked) {
      const changedBounds: any = {
        x: isLeft ? 0 : screenWidth - bounds.width,
      };
      if (isDocked !== this.#isDocked) {
        changedBounds.width = this.convertToFinalWidth(this.#width, bounds);
      }
      this.#mainWindow.setBounds(changedBounds);
      Object.assign(bounds, changedBounds);
    } else if (!isDocked && isDocked !== this.#isDocked) {
      const changedBounds = { width: this.convertToFinalWidth(this.#width, bounds) };
      this.#mainWindow.setBounds(changedBounds);
      Object.assign(bounds, changedBounds);
    }

    this.#isLeft = isLeft;
    this.#isDocked = isDocked;
    this.positionAlertWindowToParent(bounds);
    this.positionPanelWindowToParent(bounds);
  }

  private setBodyClass(browserWindow: BrowserWindow, { add, remove }: { add: string[], remove: string[] }) {
    const lines = [
      ...add.map(x => `document.body.classList.add("${x}")`),
      ...remove.map(x => `document.body.classList.remove("${x}")`),
    ];
    if (!browserWindow) return;
    if (!lines.length) return;
    const script = lines.join(';')
    browserWindow.webContents.executeJavaScript(`${script};`).catch(error => console.log(error));
  }

  private positionAlertWindowToParent(parentBounds: Electron.Rectangle) {
    if (!this.#alertWindow) return;
    const y = parentBounds.y + (this.#alertOffsets.y || 0);

    let x: number;
    if (this.#isLeft) {
      // alert should be to the right of the right edge of parent
      x = (parentBounds.x - 9) + parentBounds.width + (this.#alertOffsets.x || 0);
    } else {
      const bounds = this.#alertWindow.getBounds();
      x = (parentBounds.x + 8) - (this.#alertOffsets.x || 0) - bounds.width;
    }

    this.#alertWindow.setBounds({ x, y });
  }

  private positionPanelWindowToParent(parentBounds: Electron.Rectangle) {
    if (!this.#panelWindow) return;
    const y = parentBounds.y + (this.#panelOffsets.y || 0);

    let x: number;
    if (this.#isLeft) {
      // panel should be to the right of the left edge of parent
      x = parentBounds.x + (this.#panelOffsets.x || 0) + (this.#isDocked ? 0 : 8);
    } else {
      x = parentBounds.x + (parentBounds.width - this.#panelOffsets.x) - (this.#isDocked ? 0 : 9);
    }

    this.#panelWindow.setBounds({ x, y });
  }

  private extractChildWindowOffsets(details: Electron.HandlerDetails) {
    const offsets: IChildOffsets = {};
    const features: any = details.features.split(',').reduce((obj, feature: string) => {
      const [key, value] = feature.split('=').map(x => x.trim());
      return Object.assign(obj, { [key]: value });
    }, {});

    if (features.offsetX) {
      offsets.x = Number(features.offsetX);
    }
    if (features.offsetY) {
      offsets.y = Number(features.offsetY);
    }

    return offsets;
  }

  private trackChildWindows(): void {
    this.#mainWindow.webContents.setWindowOpenHandler(details => {
      let windowOptions = {};

      if (details.frameName === 'PopupAlert') {
        const parentBounds = this.#mainWindow.getBounds();
        const defaultOptions = DefaultWindowOptions[details.frameName] || {};
        this.#alertOffsets = this.extractChildWindowOffsets(details);
        windowOptions = {
          ...defaultOptions,
          x: parentBounds.x + parentBounds.width,
        };
      } else if (details.frameName === 'PopupPanel') {
        const parentBounds = this.#mainWindow.getBounds();
        const defaultOptions = DefaultWindowOptions[details.frameName] || {}
        this.#panelOffsets = this.extractChildWindowOffsets(details);
        windowOptions = {
          ...defaultOptions,
          x: parentBounds.x + 30,
          y: parentBounds.y,
        };
      }

      return {
        action: 'allow',
        overrideBrowserWindowOptions: windowOptions,
      };
    });

    this.#mainWindow.webContents.on('did-create-window', (childWindow, details) => {
      const parentBounds = this.#mainWindow.getBounds();
      if (details.frameName === 'PopupAlert') {
        this.#alertWindow = childWindow;
        this.positionAlertWindowToParent(parentBounds);
        this.#alertWindow?.setAlwaysOnTop(true, 'floating');
        const mainWindowId = this.#mainWindow.getMediaSourceId();
        this.#alertWindow.moveAbove(mainWindowId);
      } else if (details.frameName === 'PopupPanel') {
        this.#panelWindow = childWindow;
        this.positionPanelWindowToParent(parentBounds);
        this.#panelWindow?.setAlwaysOnTop(true, 'floating');
        this.bindMovePanelListener();
      } else {
        throw new Error(`Unknown child window: ${details.frameName}`);
      }
    });
  }

  private closeChildWindow(frameName: string) {
    if (frameName === 'PopupAlert') {
      this.#alertWindow.destroy();
      this.#alertWindow = null;
    } else if (frameName === 'PopupPanel') {
      this.#panelWindow.destroy();
      this.#panelWindow = null;
    }
  }

  static create(chromeAlive: ChromeAlive) {
    return new ToolbarWindow(chromeAlive);
  }
}

const DefaultWindowOptions = {
  PopupAlert: {
    frame: false,
    roundedCorners: false,
    movable: false,
    resizable: false,
    closable: false,
    transparent: true,
    hasShadow: false,
    useContentSize: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: `${__dirname}/PagePreload.js`,
    },
  },
  PopupPanel: {
    frame: false,
    roundedCorners: false,
    movable: true,
    resizable: false,
    closable: false,
    transparent: true,
    acceptFirstMouse: true,
    hasShadow: false,
    useContentSize: true,
    webPreferences: {
      preload: `${__dirname}/PagePreload.js`,
    },
  }
}

interface IChildOffsets {
  x?: number;
  y?: number;
}
