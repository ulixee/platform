import IDataboxOutputEvent from '../events/IDataboxOutputEvent';
import { IHeroSessionArgs } from './ISessionApi';
import IDataboxCollectedAssets from '../IDataboxCollectedAssets';

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
export function IDataboxApiStatics(constructor: IDataboxApi) {}

export default interface IDataboxApi {
  getOutput(args?: IHeroSessionArgs): IDataboxOutputEvent;
  getCollectedAssets(args?: IHeroSessionArgs): Promise<IDataboxCollectedAssets>;
  runExtract(args: IHeroSessionArgs): Promise<{
    success: boolean;
    error?: Error;
  }>;
}
