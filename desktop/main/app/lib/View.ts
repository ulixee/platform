import { BrowserView } from 'electron';
import Rectangle = Electron.Rectangle;
import BrowserWindow = Electron.BrowserWindow;
import WebContents = Electron.WebContents;
import generateContextMenu from '../menus/generateContextMenu';

export default class View {
  public isHidden: boolean;
  public bounds: Rectangle;
  public browserView: BrowserView;

  public get webContents(): WebContents {
    return this.browserView.webContents;
  }

  protected isAttached = false;
  protected readonly window: BrowserWindow;

  constructor(window: BrowserWindow, webPreferences: Electron.WebPreferences = {}) {
    this.window = window;
    this.browserView = new BrowserView({
      webPreferences: {
        sandbox: false,
        contextIsolation: false,
        ...webPreferences,
      },
    });
  }

  public addContextMenu(): void {
    this.webContents.on('context-menu', (e, params) => {
      generateContextMenu(params, this.webContents).popup();
    });
  }

  public attach(): void {
    if (!this.isAttached) {
      this.window.addBrowserView(this.browserView);
      this.isAttached = true;
    }
  }

  public bringToFront(): void {
    this.attach();
    this.window.setTopBrowserView(this.browserView);
  }

  public detach(): void {
    if (this.browserView) this.window.removeBrowserView(this.browserView);
    this.isAttached = false;
  }

  public destroy(): void {
    this.detach();
    this.browserView = null;
  }

  public hide(): void {
    const { x, y } = this.bounds ?? { x: 0, y: 0 };
    this.setBounds({ x, y, width: 0, height: 0 });
  }

  public async getContentsHeight(): Promise<number> {
    return await this.webContents.executeJavaScript(
      `document.querySelector('body > #app').offsetHeight`,
    );
  }

  public setBounds(newBounds: Rectangle): void {
    if (
      this.bounds &&
      this.bounds.x === newBounds.x &&
      this.bounds.y === newBounds.y &&
      this.bounds.width === newBounds.width &&
      this.bounds.height === newBounds.height
    ) {
      return;
    }
    this.browserView.setBounds(newBounds);
    this.bounds = newBounds;
    this.isHidden = newBounds.width === 0 && newBounds.height === 0;
  }

  public static async getTargetInfo(wc: WebContents): Promise<{
    targetId: string;
    browserContextId: string;
    url: string;
  }> {
    await wc.debugger.attach();
    const { targetInfo } = await wc.debugger.sendCommand('Target.getTargetInfo');
    await wc.debugger.detach();
    return targetInfo;
  }
}
