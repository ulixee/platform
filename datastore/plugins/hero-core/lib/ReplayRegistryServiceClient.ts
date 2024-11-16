import { ConnectionToCore } from '@ulixee/net';
import {
  IReplayRegistryApis,
  IReplayRegistryApiTypes,
} from '@ulixee/platform-specification/services/ReplayRegistryApis';

export default class ReplayRegistryServiceClient {
  constructor(private client: ConnectionToCore<IReplayRegistryApis, {}>) {}

  public async store(
    details: IReplayRegistryApiTypes['ReplayRegistry.store']['args'],
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.store']['result']> {
    return await this.client.sendRequest({
      command: 'ReplayRegistry.store',
      args: [details],
    });
  }

  public async delete(
    sessionId: string,
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.delete']['result']> {
    return await this.client.sendRequest({
      command: 'ReplayRegistry.delete',
      args: [{ sessionId }],
    });
  }

  public async get(
    sessionId: string,
  ): Promise<IReplayRegistryApiTypes['ReplayRegistry.get']['result']> {
    return await this.client.sendRequest({
      command: 'ReplayRegistry.get',
      args: [{ sessionId }],
    });
  }

  public async ids(): Promise<IReplayRegistryApiTypes['ReplayRegistry.ids']['result']> {
    return await this.client.sendRequest({
      command: 'ReplayRegistry.ids',
      args: [{}],
    });
  }
}
