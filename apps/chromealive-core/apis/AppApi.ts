import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import { IAppApiStatics } from '@ulixee/apps-chromealive-interfaces/apis/IAppApi';
import AliveBarPositioner from '../lib/AliveBarPositioner';
import ChromeAliveCore from '../index';

@IAppApiStatics
export default class AppApi {
  static boundsChanged(): { error?: Error } {
    return {};
  }

  static ready(args: { workarea: IBounds }): void {
    AliveBarPositioner.onAppReady(args.workarea);
  }

  static focus(): void {
    ChromeAliveCore.toggleAppTop(true);
  }
}
