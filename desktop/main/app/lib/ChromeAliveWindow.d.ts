import { IChromeAliveSessionApis } from '@ulixee/desktop-interfaces/apis';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import { BrowserWindow } from 'electron';
import ApiClient from './ApiClient';
import StaticServer from './StaticServer';
export default class ChromeAliveWindow {
    #private;
    readonly session: {
        heroSessionId: string;
        dbPath: string;
    };
    private staticServer;
    private static pages;
    window: BrowserWindow;
    api: ApiClient<IChromeAliveSessionApis, IChromeAliveSessionEvents>;
    enableDevtoolsOnDevtools: string | boolean;
    private get activeTab();
    constructor(session: {
        heroSessionId: string;
        dbPath: string;
    }, staticServer: StaticServer, cloudAddress: string);
    replayControl(direction: 'back' | 'forward'): void;
    load(): Promise<void>;
    onClose(): Promise<void>;
    reconnect(address: string): Promise<void>;
    private addReplayTab;
    private createApi;
    private injectCloudAddress;
    private onApiClose;
    private addDevtoolsOnDevtools;
    private activateView;
    private relayout;
    private closeOpenPopup;
    private onChromeAliveEvent;
    private trackChildWindow;
}
