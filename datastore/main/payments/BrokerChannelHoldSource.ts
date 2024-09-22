import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import { ADDRESS_PREFIX, BalanceChangeBuilder } from '@argonprotocol/localchain';
import { ConnectionToCore } from '@ulixee/net';
import HttpTransportToCore from '@ulixee/net/lib/HttpTransportToCore';
import { IDatabrokerApis } from '@ulixee/platform-specification/datastore';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import Identity from '@ulixee/platform-utils/lib/Identity';
import serdeJson from '@ulixee/platform-utils/lib/serdeJson';
import { nanoid } from 'nanoid';
import { IChannelHoldDetails, IChannelHoldSource } from './ArgonReserver';

export default class BrokerChannelHoldSource implements IChannelHoldSource {
  public get sourceKey(): string {
    return `broker-${this.host.split('://').pop().replaceAll(/\.:/g, '-')}`;
  }

  private readonly connectionToCore: ConnectionToCore<IDatabrokerApis, {}>;
  private keyring = new Keyring({ type: 'sr25519', ss58Format: ADDRESS_PREFIX });
  private readonly loadPromise: Promise<void | Error>;

  constructor(
    public host: string,
    public readonly authentication: Identity,
  ) {
    this.connectionToCore = new ConnectionToCore(new HttpTransportToCore(this.host));
    this.loadPromise = this.load().catch(err => err);
  }

  public async close(): Promise<void> {
    await this.connectionToCore.disconnect();
  }

  public async load(): Promise<void> {
    const mnemonic = mnemonicGenerate();
    this.keyring.addFromMnemonic(mnemonic);
    await this.connectionToCore.connect();
  }

  public async getBalance(): Promise<bigint> {
    const error = await this.loadPromise;
    if (error) throw error;
    const { balance } = await this.connectionToCore.sendRequest({
      command: 'Databroker.getBalance',
      args: [{ identity: this.authentication.bech32 }],
    });
    return balance;
  }

  public async createChannelHold(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IChannelHoldDetails> {
    const error = await this.loadPromise;
    if (error) throw error;
    const nonce = nanoid(10);
    const signatureMessage = BrokerChannelHoldSource.createSignatureMessage(
      paymentInfo.domain,
      paymentInfo.id,
      this.authentication.publicKey,
      milligons,
      nonce,
    );

    return await this.connectionToCore.sendRequest({
      command: 'Databroker.createChannelHold',
      args: [
        {
          domain: paymentInfo.domain,
          datastoreId: paymentInfo.id,
          recipient: paymentInfo.recipient,
          milligons,
          delegatedSigningAddress: this.keyring.pairs[0].address,
          authentication: {
            identity: this.authentication.bech32,
            signature: this.authentication.sign(signatureMessage),
            nonce,
          },
        },
      ],
    });
  }

  public async updateChannelHoldSettlement(
    channelHold: IChannelHoldDetails,
    updatedSettlement: bigint,
  ): Promise<IBalanceChange> {
    channelHold.balanceChange.notes[0].milligons = updatedSettlement;
    channelHold.balanceChange.balance =
      channelHold.balanceChange.channelHoldNote.milligons - updatedSettlement;
    const json = serdeJson(channelHold.balanceChange);
    const bytes = BalanceChangeBuilder.toSigningMessage(json);
    const signature = this.keyring.getPairs()[0].sign(bytes, { withType: true });
    channelHold.balanceChange.signature = Buffer.from(signature);
    return channelHold.balanceChange;
  }

  public static createSignatureMessage(
    domain: string | null,
    datastoreId: string,
    identity: Buffer,
    milligons: bigint,
    nonce: string,
  ): Buffer {
    return sha256(
      concatAsBuffer(
        'Databroker.createChannelHold',
        identity,
        nonce,
        domain,
        datastoreId,
        milligons.toString(),
      ),
    );
  }

  public static async getBalance(host: string, identity: string): Promise<bigint> {
    const brokerUrl = toUrl(host);
    const remoteTransport = new HttpTransportToCore(brokerUrl.href);
    const connectionToCore = new ConnectionToCore<IDatabrokerApis, any>(remoteTransport);
    const x = await connectionToCore.sendRequest({
      command: 'Databroker.getBalance',
      args: [{ identity }],
    });
    return x.balance;
  }
}
