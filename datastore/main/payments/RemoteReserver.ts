import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { ConnectionToCore } from '@ulixee/net';
import { IPayment } from '@ulixee/platform-specification';
import { IPaymentServiceApis } from '@ulixee/platform-specification/datastore';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { nanoid } from 'nanoid';
import { IPaymentEvents, IPaymentReserver } from '../interfaces/IPaymentService';

export default class RemoteReserver
  extends TypedEventEmitter<IPaymentEvents>
  implements IPaymentReserver
{
  private authenticationToken: string;

  constructor(readonly connectionToCore: ConnectionToCore<IPaymentServiceApis, {}>) {
    super();
  }

  public async authenticate(identity: Identity): Promise<void> {
    const nonce = nanoid(10);
    const message = RemoteReserver.getMessage(identity.bech32, nonce);

    const auth = await this.connectionToCore.sendRequest({
      command: 'PaymentService.authenticate',
      args: [
        {
          authentication: {
            identity: identity.bech32,
            signature: identity.sign(message),
            nonce,
          },
        },
      ],
    });
    this.authenticationToken = auth.authenticationToken;
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }

  public async reserve(
    info: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
  ): Promise<IPayment> {
    if (!info.microgons || !info.recipient) return null;

    return await this.connectionToCore.sendRequest({
      command: 'PaymentService.reserve',
      args: [{ ...info, authenticationToken: this.authenticationToken }],
    });
  }

  public async finalize(
    info: IPaymentServiceApiTypes['PaymentService.finalize']['args'],
  ): Promise<void> {
    await this.connectionToCore.sendRequest({
      command: 'PaymentService.finalize',
      args: [{ ...info, authenticationToken: this.authenticationToken }],
    });
  }

  public static getMessage(identity: string, nonce: string): Buffer {
    return sha256(concatAsBuffer('PaymentService.authenticate', identity, nonce));
  }
}
