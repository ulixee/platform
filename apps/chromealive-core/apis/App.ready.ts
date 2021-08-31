import { IAppReadyArgs } from '@ulixee/apps-chromealive-interfaces/apis/IAppReadyApi';
import AliveBarPositioner from '../lib/AliveBarPositioner';

export default function appReadyApi(args: IAppReadyArgs): void {
  AliveBarPositioner.onAppReady(args.workarea);
}
