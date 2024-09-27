import IArgonPaymentProcessor from '@ulixee/datastore-core/interfaces/IArgonPaymentProcessor';
import { ConnectionToCore } from '@ulixee/net';
import IArgonPaymentProcessorApiTypes, {
  IArgonPaymentProcessorApis,
} from '@ulixee/platform-specification/services/ArgonPaymentProcessorApis';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';

export default class ArgonPaymentProcessorClient implements IArgonPaymentProcessor {
  constructor(readonly serviceClient: ConnectionToCore<IArgonPaymentProcessorApis, {}>) {}

  public getPaymentInfo(): Promise<
    IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.getPaymentInfo']['result']
  > {
    return this.serviceClient.sendRequest({
      command: 'ArgonPaymentProcessor.getPaymentInfo',
      args: [],
    });
  }

  public async debit(
    data: IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.debit']['args'],
  ): Promise<IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.debit']['result']> {
    return this.serviceClient.sendRequest({
      command: 'ArgonPaymentProcessor.debit',
      args: [data],
    });
  }

  public finalize(
    data: IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.finalize']['args'],
  ): Promise<IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.finalize']['result']> {
    return this.serviceClient.sendRequest({
      command: 'ArgonPaymentProcessor.finalize',
      args: [data],
    });
  }

  public async importChannelHold(
    data: IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.importChannelHold']['args'],
    _datastoreManifest: IDatastoreManifest,
  ): Promise<IArgonPaymentProcessorApiTypes['ArgonPaymentProcessor.importChannelHold']['result']> {
    return this.serviceClient.sendRequest({
      command: 'ArgonPaymentProcessor.importChannelHold',
      args: [data] as any,
    });
  }
}
