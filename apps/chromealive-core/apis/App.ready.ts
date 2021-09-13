import { IAppReadyArgs } from '@ulixee/apps-chromealive-interfaces/apis/IAppReadyApi';
import { AliveBarPositioner } from '../lib/AliveBarPositioner';

export function appReadyApi(args: IAppReadyArgs): void {
  AliveBarPositioner.onAppReady(args.workarea);
}
