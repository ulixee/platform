import IAppApi, { IAppApiStatics } from '@ulixee/apps-chromealive-interfaces/apis/IAppApi';
import AliveBarPositioner from '../lib/AliveBarPositioner';
import ChromeAliveCore from '../index';

@IAppApiStatics
export default class AppApi {
  static boundsChanged(): { error?: Error } {
    return {};
  }

  static ready(args: Parameters<IAppApi['ready']>[0]): void {
    ChromeAliveCore.vueServer = args.vueServer;
    AliveBarPositioner.onAppReady(args.workarea);
  }

  static focus(): void {}
}
