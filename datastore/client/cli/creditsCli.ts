import { Command, Option } from 'commander';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '../lib/DatastoreApiClient';
import CreditsStore from '../lib/CreditsStore';

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
    .description('Create Credits for a User to try out your Datastore.')
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
        'A path to an Admin Identity approved for the given Datastore or Miner.',
        'ULX_IDENTITY_PATH',
      ),
    )
    .addOption(identityPrivateKeyPassphraseOption)
    .action(async (url, { identityPath, identityPassphrase, argons }) => {
      const microgons = ArgonUtils.centagonsToMicrogons(parseFloat(argons) * 100);
      const identity = Identity.loadFromFile(identityPath, { keyPassphrase: identityPassphrase });
      const { datastoreVersionHash, host } = await DatastoreApiClient.resolveDatastoreDomain(url);
      const client = new DatastoreApiClient(host);
      try {
        const result = await client.createCredits(datastoreVersionHash, microgons, identity);

        if (!url.includes('://')) url = `http://${url}`;
        if (url.endsWith('/')) url = url.substring(0, -1);
        const domainUrl = `${url}/free-credit?${result.id}:${result.secret}`;

        console.log(`Credit URL:\n\n${domainUrl}\n`);
      } finally {
        await client.disconnect();
      }
    });

  cli
    .command('install')
    .description('Save to a local wallet.')
    .argument('<url>', 'The url of the Credit.')
    .action(async url => {
      const { datastoreVersionHash, host } = await DatastoreApiClient.resolveDatastoreDomain(url);
      const client = new DatastoreApiClient(host);
      try {
        const creditIdAndSecret = url.split('/free-credit?').pop();
        const [id, secret] = creditIdAndSecret.split(':');
        const { balance } = await client.getCreditsBalance(datastoreVersionHash, id);
        await CreditsStore.store(datastoreVersionHash.replace(/\//g, ''), {
          id,
          secret,
          remainingCredits: balance,
        });
      } finally {
        await client.disconnect();
      }
    });

  cli
    .command('get')
    .description('Get the current balance.')
    .argument('<url>', 'The url of the Datastore Credit.')
    .action(async url => {
      const { datastoreVersionHash, host } = await DatastoreApiClient.resolveDatastoreDomain(url);
      const client = new DatastoreApiClient(host);
      try {
        const creditIdAndSecret = url.split('/free-credit?').pop();
        const [id] = creditIdAndSecret.split(':');
        const { balance } = await client.getCreditsBalance(datastoreVersionHash, id);
        console.log(`Your current balance is ~${ArgonUtils.format(balance, 'argons')} (argons).`, {
          microgons: balance,
        });
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
