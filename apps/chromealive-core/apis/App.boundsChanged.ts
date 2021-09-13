import {
  IAppBoundsChangedArgs,
  IAppBoundsChangedResult,
} from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import { AliveBarPositioner } from '../lib/AliveBarPositioner';

export function appBoundsChangedApi(args: IAppBoundsChangedArgs): IAppBoundsChangedResult {
  AliveBarPositioner.onAppBoundsChanged(args.bounds);
  return {};
}
