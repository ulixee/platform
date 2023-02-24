import type TDesktopCore from '@ulixee/desktop-core';
import Env from '../env'

export default class DesktopUtils {
  public static isInstalled(): boolean {
    try {

      if (Env.disableChromeAlive) return false;
      this.getDesktop();
      return true;
    } catch (err) {
      return false;
    }
  }

  public static getDesktop(): typeof TDesktopCore {
    // eslint-disable-next-line global-require
    return require('@ulixee/desktop-core').default;
  }
}
