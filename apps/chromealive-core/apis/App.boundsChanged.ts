import {
  IAppBoundsChangedArgs,
  IAppBoundsChangedResult,
} from '@ulixee/apps-chromealive-interfaces/apis/IAppBoundsChangedApi';
import AliveBarPositioner from '../lib/AliveBarPositioner';

export default function appBoundsChangedApi(args: IAppBoundsChangedArgs): IAppBoundsChangedResult {
  AliveBarPositioner.onAppBoundsChanged(args.workarea, args.toolbarBounds);
  return {};
}
