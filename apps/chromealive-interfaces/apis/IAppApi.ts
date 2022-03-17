import { IBounds } from '../IBounds';

export default interface IAppApi {
  boundsChanged(args: { bounds: IBounds; page: string }): {
    error?: Error;
  };

  ready(args: { workarea: IBounds & { scale: number }; vueServer: string }): void;
  focus(): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
export function IAppApiStatics(staticClass: IAppApi) {}
