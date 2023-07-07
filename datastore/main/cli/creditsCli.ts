import Identity from '@ulixee/crypto/lib/Identity';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import { Command, Option } from 'commander';
import CreditsStore from '../lib/CreditsStore';
import DatastoreApiClient from '../lib/DatastoreApiClient';

export default function creditsCli(): Command {
  const cli = new Command('credits');

  const identityPrivateKeyPassphraseOption = cli
    .createOption(
      '-p, --identity-passphrase <path>',
      'A decryption passphrase to the Ulixee Admin Identity (only necessary if specified during Identity creation).',
    )
    .env('ULX_IDENTITY_PASSPHRASE');

  cli
    .command('create')
    .description('Create Argon Credits for a User to try out your Datastore.')
    .argument('<url>', 'The url to the Datastore.')
    .addOption(
      (() => {
        const option = cli.createOption(
          '-a, --argons <value>',
          'The number of Argon Credits to give out.',
        );
        option.mandatory = true;
        return option;
      })(),
    )
    .addOption(
      requiredOptionWithEnv(
        '-i, --identity-path <path>',
        'A path to an Admin Identity approved for the given Datastore or Cloud.',
        'ULX_IDENTITY_PATH',
      ),
    )
    .addOption(identityPrivateKeyPassphraseOption)
    .action(async (url, { identityPath, identityPassphrase, argons }) => {
      const microgons = ArgonUtils.centagonsToMicrogons(parseFloat(argons) * 100);
      const identity = Identity.loadFromFile(identityPath, { keyPassphrase: identityPassphrase });
      const { datastoreId, datastoreVersion, host } =
        await DatastoreApiClient.parseDatastoreUrl(url);
      const client = new DatastoreApiClient(host);
      try {
        const result = await client.createCredits(
          datastoreId,
          datastoreVersion,
          microgons,
          identity,
        );

        if (!url.includes('://')) url = `http://${url}`;
        if (url.endsWith('/')) url = url.substring(0, -1);
        const creditUrl = `${url}/free-credit?${result.id}:${result.secret}`;

        console.log(`Credit URL:\n\n${creditUrl}\n`);
      } finally {
        await client.disconnect();
      }
    });

  cli
    .command('install')
    .description('Save to a local wallet.')
    .argument('<url>', 'The url of the Credit.')
    .action(async url => {
      const { datastoreId, datastoreVersion, host } =
        await DatastoreApiClient.parseDatastoreUrl(url);
      const client = new DatastoreApiClient(host);
      try {
        const creditIdAndSecret = url.split('/free-credit?').pop();
        const [id, secret] = creditIdAndSecret.split(':');
        const { balance } = await client.getCreditsBalance(datastoreId, datastoreVersion, id);
        await CreditsStore.store(
          datastoreId,
          datastoreVersion,
          client.connectionToCore.transport.host,
          {
            id,
            secret,
            remainingCredits: balance,
          },
        );
      } finally {
        await client.disconnect();
      }
    });

  cli
    .command('get')
    .description('Get the current balance.')
    .argument('<url>', 'The url of the Datastore Credit.')
    .action(async url => {
      const { datastoreId, datastoreVersion, host } =
        await DatastoreApiClient.parseDatastoreUrl(url);
      const client = new DatastoreApiClient(host);
      try {
        const creditIdAndSecret = url.split('/free-credit?').pop();
        const [id] = creditIdAndSecret.split(':');
        const { balance } = await client.getCreditsBalance(datastoreId, datastoreVersion, id);

        console.log(
          `Your current balance is ~${ArgonUtils.format(balance, 'microgons', 'argons')} (argons).`,
          {
            microgons: balance,
          },
        );
      } finally {
        await client.disconnect();
      }
    });
  return cli;
}

function requiredOptionWithEnv(flags: string, description: string, envVar: string): Option {
  const option = new Option(flags, description);
  option.required = true;
  option.mandatory = true;
  option.env(envVar);
  return option;
}
