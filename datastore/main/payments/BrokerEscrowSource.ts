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
import { IEscrowDetails, IEscrowSource } from './ArgonReserver';

export default class BrokerEscrowSource implements IEscrowSource {
  public get sourceKey(): string {
    return `broker-${this.host.split('://').pop().replaceAll(/\.:/g, '-')}`;
  }

  private readonly connectionToCore: ConnectionToCore<IDatabrokerApis, {}>;
  private keyring = new Keyring({ type: 'sr25519', ss58Format: ADDRESS_PREFIX });
  private loadPromise: Promise<void>;

  constructor(
    public host: string,
    public readonly authentication: Identity,
  ) {
    this.connectionToCore = new ConnectionToCore(new HttpTransportToCore(this.host));
    this.loadPromise = this.load().catch(() => null);
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
    await this.loadPromise;
    const { balance } = await this.connectionToCore.sendRequest({
      command: 'Databroker.getBalance',
      args: [{ identity: this.authentication.bech32 }],
    });
    return balance;
  }

  public async createEscrow(
    paymentInfo: IPaymentServiceApiTypes['PaymentService.reserve']['args'],
    milligons: bigint,
  ): Promise<IEscrowDetails> {
    await this.loadPromise;
    const nonce = nanoid(10);
    const signatureMessage = BrokerEscrowSource.createSignatureMessage(
      paymentInfo.domain,
      paymentInfo.id,
      this.authentication.publicKey,
      milligons,
      nonce,
    );

    return await this.connectionToCore.sendRequest({
      command: 'Databroker.createEscrow',
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

  public async updateEscrowSettlement(
    escrow: IEscrowDetails,
    updatedSettlement: bigint,
  ): Promise<IBalanceChange> {
    escrow.balanceChange.notes[0].milligons = updatedSettlement;
    escrow.balanceChange.balance =
      escrow.balanceChange.escrowHoldNote.milligons - updatedSettlement;
    const json = serdeJson(escrow.balanceChange);
    const bytes = BalanceChangeBuilder.toSigningMessage(json);
    const signature = this.keyring.getPairs()[0].sign(bytes, { withType: true });
    escrow.balanceChange.signature = Buffer.from(signature);
    return escrow.balanceChange;
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
        'Databroker.createEscrow',
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
