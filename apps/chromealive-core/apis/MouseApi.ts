import { IMouseApiStatics } from '@ulixee/apps-chromealive-interfaces/apis/IMouseApi';
import AliveBarPositioner from '../lib/AliveBarPositioner';

@IMouseApiStatics
export default class MouseApi {
  static state(args: { isMousedown: boolean }): void {
    AliveBarPositioner.setMouseDown(args.isMousedown);
  }
}
