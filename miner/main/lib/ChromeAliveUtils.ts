import type IChromeAliveCore from '@ulixee/desktop-core';
import Env from '../env'

export default class ChromeAliveUtils {
  public static isInstalled(): boolean {
    try {

      if (Env.disableChromeAlive) return false;
      this.getChromeAlive();
      return true;
    } catch (err) {
      return false;
    }
  }

  public static getChromeAlive(): typeof IChromeAliveCore {
    // eslint-disable-next-line global-require
    return require('@ulixee/desktop-core').default;
  }
}
