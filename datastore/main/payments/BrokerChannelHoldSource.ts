import { ADDRESS_PREFIX, BalanceChangeBuilder } from '@argonprotocol/localchain';
import { Keyring, mnemonicGenerate } from '@argonprotocol/mainchain';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { toUrl } from '@ulixee/commons/lib/utils';
import { ConnectionToCore } from '@ulixee/net';
import HttpTransportToCore from '@ulixee/net/lib/HttpTransportToCore';
import { IDatabrokerApis } from '@ulixee/platform-specification/datastore';
import IPaymentServiceApiTypes from '@ulixee/platform-specification/datastore/PaymentServiceApis';
import IBalanceChange from '@ulixee/platform-specification/types/IBalanceChange';
import { IPaymentMethod } from '@ulixee/platform-specification/types/IPayment';
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
  private balanceChangeByChannelHoldId: { [channelHoldId: string]: IBalanceChange } = {};

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

    const holdDetails = await this.connectionToCore.sendRequest({
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
    this.balanceChangeByChannelHoldId[holdDetails.channelHoldId] = holdDetails.balanceChange;
    return holdDetails;
  }

  public async updateChannelHoldSettlement(
    channelHold: IPaymentMethod['channelHold'],
    updatedSettlement: bigint,
  ): Promise<void> {
    const balanceChange = this.balanceChangeByChannelHoldId[channelHold.id];

    // TODO: add a way to retrieve the balance change from the broker
    if (!balanceChange)
      throw new Error(`No balance change found for channel hold ${channelHold.id}`);
    balanceChange.notes[0].milligons = updatedSettlement;
    balanceChange.balance = balanceChange.channelHoldNote.milligons - updatedSettlement;
    const json = serdeJson(balanceChange);
    const bytes = BalanceChangeBuilder.toSigningMessage(json);
    const signature = this.keyring.getPairs()[0].sign(bytes, { withType: true });
    balanceChange.signature = Buffer.from(signature);
    channelHold.settledSignature = balanceChange.signature;
    channelHold.settledMilligons = updatedSettlement;
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
