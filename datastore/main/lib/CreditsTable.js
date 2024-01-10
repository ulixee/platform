"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsSchema = void 0;
const schema_1 = require("@ulixee/schema");
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const nanoid_1 = require("nanoid");
const Table_1 = require("./Table");
const postgresFriendlyNanoid = (0, nanoid_1.customAlphabet)('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz');
class CreditsTable extends Table_1.default {
    constructor() {
        super({
            name: CreditsTable.tableName,
            isPublic: false,
            description: 'Private table tracking Credits issued for the containing Datastore.',
            schema: exports.CreditsSchema,
            pricePerQuery: 0,
            async onVersionMigrated(previousVersion) {
                const previousCredits = await previousVersion.fetchInternal();
                await this.insertInternal(...previousCredits);
            },
        });
    }
    async create(microgons, secret) {
        const upstreamBalance = await this.getUpstreamCreditLimit();
        if (upstreamBalance !== undefined) {
            const allocated = (await this.queryInternal('SELECT SUM(issuedCredits) as total FROM self'));
            if (allocated.total + microgons > upstreamBalance) {
                throw new Error(`This credit amount would exceed the balance of the embedded Credits, which would make use of the Credits unstable. Please increase the limit of the credits.`);
            }
        }
        const salt = (0, nanoid_1.nanoid)(16);
        const id = `crd${postgresFriendlyNanoid(8)}`;
        secret ??= postgresFriendlyNanoid(12);
        const secretHash = (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)(id, salt, secret));
        await this.queryInternal('INSERT INTO self (id, salt, secretHash, issuedCredits, holdCredits, remainingCredits) VALUES ($1, $2, $3, $4, 0, $4)', [id, salt, secretHash, microgons]);
        return { id, secret, remainingCredits: microgons };
    }
    async get(id) {
        const [credit] = await this.queryInternal('SELECT id, issuedCredits, remainingCredits, holdCredits FROM self WHERE id = $1', [id]);
        return credit;
    }
    async summary() {
        const [result] = await this.queryInternal('SELECT COUNT(1) as count, SUM(issuedCredits) as microgons FROM self');
        return result;
    }
    async hold(id, secret, holdAmount) {
        const [credit] = await this.queryInternal('SELECT * FROM self WHERE id=$1', [id]);
        if (!credit)
            throw new Error('This is an invalid Credit.');
        const hash = (0, hashUtils_1.sha256)((0, bufferUtils_1.concatAsBuffer)(credit.id, credit.salt, secret));
        if (!hash.equals(credit.secretHash))
            throw new Error('This is an invalid Credit secret.');
        if (credit.remainingCredits < holdAmount)
            throw new Error('This Credit has insufficient balance remaining to create a payment.');
        const result = (await this.queryInternal('UPDATE self SET holdCredits = holdCredits + $2 ' +
            'WHERE id = $1 AND (remainingCredits - holdCredits - $2) >= 0 ' +
            'RETURNING (remainingCredits - holdCredits) as balance', [id, holdAmount]));
        if (result === undefined)
            throw new Error('Could not create a payment from the given Credits.');
        return result.balance;
    }
    async finalize(id, holdAmount, finalAmount) {
        const result = (await this.queryInternal('UPDATE self SET holdCredits = holdCredits - $2, remainingCredits = remainingCredits - $3 ' +
            'WHERE id = $1 ' +
            'RETURNING (remainingCredits - holdCredits) as balance', [id, holdAmount, finalAmount]));
        if (result === undefined)
            throw new Error('Could not finalize payment for the given Credits.');
        return result.balance;
    }
    async getUpstreamCreditLimit() {
        const embeddedCredits = this.datastoreInternal.metadata.remoteDatastoreEmbeddedCredits ?? {};
        if (!Object.keys(embeddedCredits).length)
            return undefined;
        let issuedCredits = 0;
        for (const [source, credit] of Object.entries(embeddedCredits)) {
            const url = this.datastoreInternal.metadata.remoteDatastores[source];
            if (!source)
                continue;
            const client = this.datastoreInternal.createApiClient(url);
            const [datastoreId, version] = url.split('/').pop().split('@v');
            const balance = await client.getCreditsBalance(datastoreId, version, credit.id);
            if (Number.isInteger(balance.issuedCredits))
                issuedCredits += balance.issuedCredits;
        }
        return issuedCredits;
    }
}
exports.default = CreditsTable;
CreditsTable.tableName = 'ulx_credits';
exports.CreditsSchema = {
    id: (0, schema_1.string)({ regexp: /^crd[A-Za-z0-9_]{8}$/ }),
    salt: (0, schema_1.string)({ length: 16 }),
    secretHash: (0, schema_1.buffer)(),
    issuedCredits: (0, schema_1.number)(),
    holdCredits: (0, schema_1.number)(),
    remainingCredits: (0, schema_1.number)(),
};
//# sourceMappingURL=CreditsTable.js.map