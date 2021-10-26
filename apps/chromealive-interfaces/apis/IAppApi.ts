import { IBounds } from '../IBounds';

export default interface IAppApi {
  boundsChanged(args: { bounds: IBounds }): {
    error?: Error;
  };

  ready(args: { workarea: IBounds }): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IAppApiStatics(constructor: IAppApi) {}
