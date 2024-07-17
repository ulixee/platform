import type TDesktopCore from '@ulixee/desktop-core';
export default class DesktopUtils {
    static isInstalled(): boolean;
    static getDesktop(): typeof TDesktopCore;
}
