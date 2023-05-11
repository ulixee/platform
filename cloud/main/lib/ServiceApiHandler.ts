import ValidatingApiHandler from '@ulixee/specification/utils/ValidatingApiHandler';
import IServicesSetupApis, {
  ServicesSetupApiSchemas,
} from '@ulixee/platform-specification/services/SetupApis';
import ICloudApiContext from '../interfaces/ICloudApiContext';

export default class ServiceApiHandler<
  Command extends keyof IServicesSetupApis & string,
> extends ValidatingApiHandler<
  typeof ServicesSetupApiSchemas,
  Command,
  IServicesSetupApis,
  ICloudApiContext
> {
  constructor(
    command: Command,
    args: {
      handler: (
        this: ServiceApiHandler<Command>,
        request: IServicesSetupApis[Command]['args'],
        context?: ICloudApiContext,
      ) => Promise<IServicesSetupApis[Command]['result']>;
    },
  ) {
    super(command, ServicesSetupApiSchemas, args);
    this.apiHandler = args.handler.bind(this);
  }
}
