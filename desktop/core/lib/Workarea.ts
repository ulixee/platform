import { IBounds } from '@ulixee/desktop-interfaces/IBounds';
import { defaultScreen } from '@ulixee/default-browser-emulator/lib/Viewports';

interface IBoundsAndScale extends IBounds {
  scale: number;
}

export default class Workarea {
  public static workarea: IBoundsAndScale;

  public static getMaxChromeBounds(): IBoundsAndScale | null {
    if (!this.workarea) return null;

    return {
      top: this.workarea.top,
      left: this.workarea.left,
      width: this.workarea.width,
      height: this.workarea.height,
      scale: this.workarea.scale,
    };
  }

  public static setHeroDefaultScreen(workarea: IBoundsAndScale): void {
    this.workarea = workarea;
    const maxbounds = this.getMaxChromeBounds();

    defaultScreen.width = maxbounds.width;
    defaultScreen.height = maxbounds.height;
    defaultScreen.scale = maxbounds.scale;
  }
}
