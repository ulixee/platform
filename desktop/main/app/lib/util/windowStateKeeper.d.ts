import { Rectangle, BrowserWindow } from 'electron';
export default class WindowStateKeeper {
    private windowName;
    windowState: Rectangle & {
        isMaximized?: boolean;
    };
    private readonly configPath;
    private events;
    constructor(windowName: string);
    track(window: BrowserWindow): void;
    save(window: BrowserWindow): void;
}
