import { IAsyncFunc } from '@ulixee/net/interfaces/IApiHandlers';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import {
  INodeRegistryApis,
  NodeRegistryApiSchemas,
} from '@ulixee/platform-specification/services/NodeRegistryApis';
import {
  IServicesSetupApis,
  ServicesSetupApiSchemas,
} from '@ulixee/platform-specification/services/SetupApis';
import { IZodApiTypes } from '@ulixee/specification/utils/IZodApi';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import ICloudApiContext from '../interfaces/ICloudApiContext';

export type TServicesApis = IServicesSetupApis<ICloudApiContext> &
  INodeRegistryApis<ICloudApiContext>;

export type TConnectionToServicesClient = IConnectionToClient<TServicesApis, {}>;

export default class HostedServiceEndpoints {
  private readonly handlersByCommand: TServicesApis;

  constructor() {
    this.handlersByCommand = {
      'Services.getSetup': async (_, ctx) => {
        const { datastoreRegistryHost, storageEngineHost, statsTrackerHost, replayRegistryHost } =
          ctx.datastoreConfiguration;
        const { nodeRegistryHost } = ctx.cloudConfiguration;

        return Promise.resolve({
          storageEngineHost,
          datastoreRegistryHost,
          nodeRegistryHost,
          statsTrackerHost,
          replayRegistryHost,
        });
      },
      'NodeRegistry.getNodes': async ({ count }, ctx) => {
        const nodes = await ctx.nodeRegistry.getNodes(count);
        return { nodes };
      },
      'NodeRegistry.register': async (registration, ctx) => {
        return await ctx.nodeTracker.track({
          ...registration,
          lastSeenDate: new Date(),
          isClusterNode: true,
        });
      },
      'NodeRegistry.health': async (health, ctx) => {
        await ctx.nodeTracker.checkin(health);
        return { success: true };
      },
    };

    for (const [api, handler] of Object.entries(this.handlersByCommand)) {
      const validationSchema = NodeRegistryApiSchemas[api] ?? ServicesSetupApiSchemas[api];
      this.handlersByCommand[api] = validateThenRun.bind(
        this,
        api,
        handler.bind(this),
        validationSchema,
      );
    }
  }

  public attachToConnection(
    connection: ConnectionToClient<any, any>,
    context: ICloudApiContext,
  ): TConnectionToServicesClient {
    Object.assign(connection.apiHandlers, this.handlersByCommand);
    Object.assign(connection.handlerMetadata, context);
    return connection;
  }
}

function validateThenRun(
  api: string,
  handler: IAsyncFunc,
  validationSchema: IZodApiTypes | undefined,
  args: any,
  context: ICloudApiContext,
): Promise<any> {
  if (!validationSchema) return handler(args, context);
  // NOTE: mutates `errors`
  const result = validationSchema.args.safeParse(args);
  if (result.success === true) return handler(result.data, context);

  throw ValidationError.fromZodValidation(
    `The parameters for this command (${api}) are invalid.`,
    result.error,
  );
}
