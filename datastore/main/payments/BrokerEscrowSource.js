"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const keyring_1 = require("@polkadot/keyring");
const util_crypto_1 = require("@polkadot/util-crypto");
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const utils_1 = require("@ulixee/commons/lib/utils");
const localchain_1 = require("@ulixee/localchain");
const net_1 = require("@ulixee/net");
const HttpTransportToCore_1 = require("@ulixee/net/lib/HttpTransportToCore");
const serdeJson_1 = require("@ulixee/platform-utils/lib/serdeJson");
const nanoid_1 = require("nanoid");
class BrokerEscrowSource {
    get sourceKey() {
        return `broker-${this.host.split('://').pop().replaceAll(/\.:/g, '-')}`;
    }
    constructor(host, authentication) {
        this.host = host;
        this.authentication = authentication;
        this.keyring = new keyring_1.Keyring({ type: 'sr25519', ss58Format: localchain_1.ADDRESS_PREFIX });
        this.connectionToCore = new net_1.ConnectionToCore(new HttpTransportToCore_1.default(this.host));
        this.loadPromise = this.load().catch(() => null);
    }
    async close() {
        await this.connectionToCore.disconnect();
    }
    async load() {
        const mnemonic = (0, util_crypto_1.mnemonicGenerate)();
        this.keyring.addFromMnemonic(mnemonic);
        await this.connectionToCore.connect();
    }
    async getBalance() {
        await this.loadPromise;
        const { balance } = await this.connectionToCore.sendRequest({
            command: 'Databroker.getBalance',
            args: [{ identity: this.authentication.bech32 }],
        });
        return balance;
    }
    async createEscrow(paymentInfo, milligons) {
        await this.loadPromise;
        const nonce = (0, nanoid_1.nanoid)(10);
        const signatureMessage = BrokerEscrowSource.createSignatureMessage(paymentInfo.domain, paymentInfo.id, this.authentication.publicKey, milligons, nonce);
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
    async updateEscrowSettlement(escrow, updatedSettlement) {
        escrow.balanceChange.notes[0].milligons = updatedSettlement;
        escrow.balanceChange.balance =
            escrow.balanceChange.escrowHoldNote.milligons - updatedSettlement;
        const json = (0, serdeJson_1.default)(escrow.balanceChange);
        const bytes = localchain_1.BalanceChangeBuilder.toSigningMessage(json);
        const signature = this.keyring.getPairs()[0].sign(bytes, { withType: true });
        escrow.balanceChange.signature = Buffer.from(signature);
        return escrow.balanceChange;
    }
    static createSignatureMessage(domain, datastoreId, identity, milligons, nonce) {
        return (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)('Databroker.createEscrow', identity, nonce, domain, datastoreId, milligons.toString()));
    }
    static async getBalance(host, identity) {
        const brokerUrl = (0, utils_1.toUrl)(host);
        const remoteTransport = new HttpTransportToCore_1.default(brokerUrl.href);
        const connectionToCore = new net_1.ConnectionToCore(remoteTransport);
        const x = await connectionToCore.sendRequest({
            command: 'Databroker.getBalance',
            args: [{ identity }],
        });
        return x.balance;
    }
}
exports.default = BrokerEscrowSource;
//# sourceMappingURL=BrokerEscrowSource.js.map