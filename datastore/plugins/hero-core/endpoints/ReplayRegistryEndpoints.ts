import { validateThenRun } from '@ulixee/datastore-core/endpoints/HostedServicesEndpoints';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import {
  IReplayRegistryApis,
  ReplayRegistryApiSchemas,
} from '@ulixee/platform-specification/services/ReplayRegistryApis';
import ReplayRegistry from '../lib/ReplayRegistry';

export type TServicesApis = IReplayRegistryApis<IHeroPluginApiContext>;

export default class ReplayRegistryEndpoints {
  private readonly handlersByCommand: TServicesApis;

  constructor() {
    this.handlersByCommand = {
      'ReplayRegistry.store': async ({ sessionId, db }, ctx) => {
        await ctx.replayRegistry.replayStorageRegistry.store(sessionId, db);
        return { success: true };
      },
      'ReplayRegistry.delete': async ({ sessionId }, ctx) => {
        return await ctx.replayRegistry.replayStorageRegistry.delete(sessionId);
      },
      'ReplayRegistry.get': async ({ sessionId }, ctx) => {
        const result = await ctx.replayRegistry.replayStorageRegistry.get(sessionId);
        if (result) return { db: await result.db };
        return null;
      },
      'ReplayRegistry.ids': async (_, ctx) => {
        const results = await ctx.replayRegistry.ids();
        return { sessionIds: results };
      },
    };

    for (const [api, handler] of Object.entries(this.handlersByCommand)) {
      const validationSchema = ReplayRegistryApiSchemas[api];
      this.handlersByCommand[api] = validateThenRun.bind(
        this,
        api,
        handler.bind(this),
        validationSchema,
      );
    }
  }

  public attachToConnection<T extends ConnectionToClient<any, any>>(
    connection: T,
    context: IHeroPluginApiContext,
  ): T {
    Object.assign(connection.apiHandlers, this.handlersByCommand);
    Object.assign(connection.handlerMetadata, context);
    return connection;
  }
}

export interface IHeroPluginApiContext {
  replayRegistry: ReplayRegistry;
}
