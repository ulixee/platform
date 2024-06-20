import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import ChromeAliveWindow from './ChromeAliveWindow';
import { Menubar } from './Menubar';
import ApiManager from './ApiManager';
import DesktopWindow from './DesktopWindow';
export declare class WindowManager {
    #private;
    private menuBar;
    private apiManager;
    get activeChromeAliveWindow(): ChromeAliveWindow;
    chromeAliveWindows: ChromeAliveWindow[];
    activeChromeAliveWindowIdx: number;
    readonly desktopWindow: DesktopWindow;
    events: EventSubscriber;
    constructor(menuBar: Menubar, apiManager: ApiManager);
    openDesktop(): Promise<void>;
    close(): void;
    loadChromeAliveWindow(data: {
        cloudAddress: string;
        heroSessionId: string;
        dbPath: string;
    }): Promise<void>;
    pickHeroSession(): Promise<void>;
    private onArgonFileOpened;
    private setMenu;
    private onApiEvent;
    private onNewCloudAddress;
    private bindIpcEvents;
    private closeWindow;
    private checkOpenWindows;
    private focusWindow;
}
