"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const ArgonUtils_1 = require("@ulixee/sidechain/lib/ArgonUtils");
const commander_1 = require("commander");
const CreditsStore_1 = require("../lib/CreditsStore");
const DatastoreApiClient_1 = require("../lib/DatastoreApiClient");
function creditsCli() {
    const cli = new commander_1.Command('credits');
    const identityPrivateKeyPassphraseOption = cli
        .createOption('-p, --identity-passphrase <path>', 'A decryption passphrase to the Ulixee Admin Identity (only necessary if specified during Identity creation).')
        .env('ULX_IDENTITY_PASSPHRASE');
    cli
        .command('create')
        .description('Create Argon Credits for a User to try out your Datastore.')
        .argument('<url>', 'The url to the Datastore.')
        .addOption((() => {
        const option = cli.createOption('-a, --argons <value>', 'The number of Argon Credits to give out.');
        option.mandatory = true;
        return option;
    })())
        .addOption(requiredOptionWithEnv('-i, --identity-path <path>', 'A path to an Admin Identity approved for the given Datastore or Cloud.', 'ULX_IDENTITY_PATH'))
        .addOption(identityPrivateKeyPassphraseOption)
        .action(async (url, { identityPath, identityPassphrase, argons }) => {
        const microgons = ArgonUtils_1.default.centagonsToMicrogons(parseFloat(argons) * 100);
        const identity = Identity_1.default.loadFromFile(identityPath, { keyPassphrase: identityPassphrase });
        const { datastoreId, datastoreVersion, host } = await DatastoreApiClient_1.default.parseDatastoreUrl(url);
        const client = new DatastoreApiClient_1.default(host);
        try {
            const result = await client.createCredits(datastoreId, datastoreVersion, microgons, identity);
            if (!url.includes('://'))
                url = `http://${url}`;
            if (url.endsWith('/'))
                url = url.substring(0, -1);
            const creditUrl = `${url}/free-credit?${result.id}:${result.secret}`;
            console.log(`Credit URL:\n\n${creditUrl}\n`);
        }
        finally {
            await client.disconnect();
        }
    });
    cli
        .command('install')
        .description('Save to a local wallet.')
        .argument('<url>', 'The url of the Credit.')
        .action(async (url) => {
        const { datastoreId, datastoreVersion, host } = await DatastoreApiClient_1.default.parseDatastoreUrl(url);
        const client = new DatastoreApiClient_1.default(host);
        try {
            const creditIdAndSecret = url.split('/free-credit?').pop();
            const [id, secret] = creditIdAndSecret.split(':');
            const { balance } = await client.getCreditsBalance(datastoreId, datastoreVersion, id);
            await CreditsStore_1.default.store(datastoreId, datastoreVersion, client.connectionToCore.transport.host, {
                id,
                secret,
                remainingCredits: balance,
            });
        }
        finally {
            await client.disconnect();
        }
    });
    cli
        .command('get')
        .description('Get the current balance.')
        .argument('<url>', 'The url of the Datastore Credit.')
        .action(async (url) => {
        const { datastoreId, datastoreVersion, host } = await DatastoreApiClient_1.default.parseDatastoreUrl(url);
        const client = new DatastoreApiClient_1.default(host);
        try {
            const creditIdAndSecret = url.split('/free-credit?').pop();
            const [id] = creditIdAndSecret.split(':');
            const { balance } = await client.getCreditsBalance(datastoreId, datastoreVersion, id);
            console.log(`Your current balance is ~${ArgonUtils_1.default.format(balance, 'microgons', 'argons')} (argons).`, {
                microgons: balance,
            });
        }
        finally {
            await client.disconnect();
        }
    });
    return cli;
}
exports.default = creditsCli;
function requiredOptionWithEnv(flags, description, envVar) {
    const option = new commander_1.Option(flags, description);
    option.required = true;
    option.mandatory = true;
    option.env(envVar);
    return option;
}
//# sourceMappingURL=creditsCli.js.map