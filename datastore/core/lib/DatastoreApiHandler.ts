import ValidatingApiHandler from '@ulixee/specification/utils/ValidatingApiHandler';
import IDatastoreApis, { DatastoreApiSchemas } from '@ulixee/specification/datastore/DatastoreApis';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';

export default class DatastoreApiHandler<
  Command extends keyof IDatastoreApis & string,
> extends ValidatingApiHandler<typeof DatastoreApiSchemas, Command, IDatastoreApis, IDatastoreApiContext> {
  constructor(
    command: Command,
    args: {
      handler: (
        this: DatastoreApiHandler<Command>,
        args: IDatastoreApis[Command]['args'],
        options?: IDatastoreApiContext,
      ) => Promise<IDatastoreApis[Command]['result']>;
    },
  ) {
    super(command, DatastoreApiSchemas, args);
    this.apiHandler = args.handler.bind(this);
  }
}
