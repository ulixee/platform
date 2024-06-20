import { WebContents } from 'electron';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import StaticServer from './StaticServer';
import ApiManager from './ApiManager';
export default class DesktopWindow extends TypedEventEmitter<{
    close: void;
    focus: void;
}> {
    #private;
    private apiManager;
    get isOpen(): boolean;
    get isFocused(): boolean;
    get webContents(): WebContents;
    constructor(staticServer: StaticServer, apiManager: ApiManager);
    focus(): void;
    open(show?: boolean): Promise<void>;
    close(e: any, force?: boolean): void;
}
