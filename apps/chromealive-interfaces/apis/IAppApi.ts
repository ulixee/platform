import { IBounds } from '../IBounds';

export default interface IAppApi {
  connect(args: { workarea: IBounds & { scale: number } }): Promise<{ id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
export function IAppApiStatics(staticClass: IAppApi) {}
