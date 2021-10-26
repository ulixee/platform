import { IBounds } from '@ulixee/apps-chromealive-interfaces/IBounds';
import { IAppApiStatics } from '@ulixee/apps-chromealive-interfaces/apis/IAppApi';
import AliveBarPositioner from '../lib/AliveBarPositioner';

@IAppApiStatics
export default class AppApi {
  static boundsChanged(args: { bounds: IBounds }): { error?: Error } {
    AliveBarPositioner.onAppBoundsChanged(args.bounds);
    return {};
  }

  static ready(args: { workarea: IBounds }): void {
    AliveBarPositioner.onAppReady(args.workarea);
  }
}
