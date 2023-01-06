import IDatastoreOutputEvent from '../events/IDatastoreOutputEvent';
import { IHeroSessionArgs } from './ISessionApi';
import IDatastoreCollectedAssets from '../IDatastoreCollectedAssets';

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
export function IDatastoreApiStatics(constructor: IDatastoreApi) {}

export default interface IDatastoreApi {
  getOutput(args?: IHeroSessionArgs): IDatastoreOutputEvent;
  getCollectedAssets(args?: IHeroSessionArgs): Promise<IDatastoreCollectedAssets>;
  execExtract(args: IHeroSessionArgs): Promise<{
    success: boolean;
    error?: Error;
  }>;
}
