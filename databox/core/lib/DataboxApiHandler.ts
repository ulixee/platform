import ValidatingApiHandler from '@ulixee/specification/utils/ValidatingApiHandler';
import IDataboxApis, { DataboxApiSchemas } from '@ulixee/specification/databox/DataboxApis';
import IDataboxApiContext from '../interfaces/IDataboxApiContext';

export default class DataboxApiHandler<
  Command extends keyof IDataboxApis & string,
> extends ValidatingApiHandler<typeof DataboxApiSchemas, Command, IDataboxApis, IDataboxApiContext> {
  constructor(
    command: Command,
    args: {
      handler: (
        this: DataboxApiHandler<Command>,
        args: IDataboxApis[Command]['args'],
        options?: IDataboxApiContext,
      ) => Promise<IDataboxApis[Command]['result']>;
    },
  ) {
    super(command, DataboxApiSchemas, args);
    this.apiHandler = args.handler.bind(this);
  }
}
