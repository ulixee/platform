/// <reference types="node" />
import { Tray } from 'electron';
import { EventEmitter } from 'events';
import IMenubarOptions from '../interfaces/IMenubarOptions';
import StaticServer from './StaticServer';
export declare class Menubar extends EventEmitter {
    #private;
    readonly staticServer: StaticServer;
    constructor(options: IMenubarOptions);
    get tray(): Tray;
    private bindSignals;
    private hideMenu;
    private onSecondInstance;
    private handleArgonFile;
    private onFileOpened;
    private showMenu;
    private beforeQuit;
    private appExit;
    private appReady;
    private listenForMouseDown;
    private initUpdater;
    private noUpdateAvailable;
    private onUpdateAvailable;
    private onDownloadProgress;
    private versionCheck;
    private versionInstall;
    private clicked;
    private rightClicked;
    private onDropFiles;
    private checkForUpdates;
    private createWindow;
    private windowClear;
    private stopCloud;
    private startCloud;
    private updateLocalCloudStatus;
    private sendToFrontend;
}
