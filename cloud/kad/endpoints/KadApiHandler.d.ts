import { IKadApiTypes, KadApiSchemas } from '@ulixee/platform-specification/cloud/KadApis';
import ValidatingApiHandler from '@ulixee/specification/utils/ValidatingApiHandler';
import IKadApiContext from '../interfaces/IKadApiContext';
export default class KadApiHandler<Command extends keyof IKadApiTypes & string> extends ValidatingApiHandler<typeof KadApiSchemas, Command, IKadApiTypes, IKadApiContext> {
    constructor(command: Command, args: {
        handler: (this: KadApiHandler<Command>, request: IKadApiTypes[Command]['args'], context?: IKadApiContext) => Promise<IKadApiTypes[Command]['result']>;
    });
    handler(rawArgs: unknown, options?: IKadApiContext): Promise<IKadApiTypes[Command]['result']>;
}
