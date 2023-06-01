import { IKadApiTypes, KadApiSchemas } from '@ulixee/platform-specification/cloud/KadApis';
import ValidatingApiHandler from '@ulixee/specification/utils/ValidatingApiHandler';
import IKadApiContext from '../interfaces/IKadApiContext';

export default class KadApiHandler<
  Command extends keyof IKadApiTypes & string,
> extends ValidatingApiHandler<typeof KadApiSchemas, Command, IKadApiTypes, IKadApiContext> {
  constructor(
    command: Command,
    args: {
      handler: (
        this: KadApiHandler<Command>,
        request: IKadApiTypes[Command]['args'],
        context?: IKadApiContext,
      ) => Promise<IKadApiTypes[Command]['result']>;
    },
  ) {
    super(command, KadApiSchemas, args);
    this.apiHandler = args.handler.bind(this);
  }

  override async handler(
    rawArgs: unknown,
    options?: IKadApiContext,
  ): Promise<IKadApiTypes[Command]['result']> {
    if (options.connection?.nodeInfo) {
      options.kad.peerStore.sawNode(options.connection.nodeInfo.nodeId);
    }
    if (
      this.command !== 'Kad.connect' &&
      this.command !== 'Kad.verify' &&
      !options.connection.verifiedPromise.isResolved
    ) {
      options.logger.warn('Kad API called before verify. Waiting to verify before proceeding', {
        command: this.command,
      });
      await options.connection.verifiedPromise;
    }
    return super.handler(rawArgs, options);
  }
}
