import { BrowserView } from 'electron';
import Rectangle = Electron.Rectangle;
import BrowserWindow = Electron.BrowserWindow;
import WebContents = Electron.WebContents;
export default class View {
    isHidden: boolean;
    bounds: Rectangle;
    browserView: BrowserView;
    get webContents(): WebContents;
    protected isAttached: boolean;
    protected readonly window: BrowserWindow;
    constructor(window: BrowserWindow, webPreferences?: Electron.WebPreferences);
    addContextMenu(): void;
    attach(): void;
    bringToFront(): void;
    detach(): void;
    destroy(): void;
    hide(): void;
    getContentsHeight(): Promise<number>;
    setBounds(newBounds: Rectangle): void;
    static getTargetInfo(wc: WebContents): Promise<{
        targetId: string;
        browserContextId: string;
        url: string;
    }>;
}
