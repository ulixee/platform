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
          '-m, --amount <value>',
          'The value of this Credit. Amount can postfix "c" for centagons (eg, 50c) or "m" for microgons (5000000m).',
        );
        option.mandatory = true;
        option.parseArg = ((arg): string => {
          if (typeof arg === 'string' && /\d+[mc]?/.test(arg)) return arg as string;
        }) as any;
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
    .action(async (url, { identityPath, identityPassphrase, amount }) => {
      const parsedUrl = new URL(url);
      const client = new DatastoreApiClient(parsedUrl.origin);
      const microgons = ArgonUtils.parseUnits(amount, 'microgons');
      const identity = Identity.loadFromFile(identityPath, { keyPassphrase: identityPassphrase });
      const result = await client.createCredits(parsedUrl.pathname, microgons, identity);

      // TODO: output a url to send the user to
      console.log(`Credit created!`, { credit: result });
    });

  cli
    .command('install')
    .description('Save to a local wallet.')
    .argument('<url>', 'The url of the Credit.')
    .argument('<secret>', 'The Credit secret.')
    .action(async (url, secret) => {
      const client = new DatastoreApiClient(url);
      const parsedUrl = new URL(url);
      const [datastoreVersion, id] = parsedUrl.pathname.split('/credit/');
      const { balance } = await client.getCreditsBalance(datastoreVersion, id);
      await CreditsStore.store(parsedUrl.origin, datastoreVersion.replace(/\//g, ''), {
        id,
        secret,
        remainingCredits: balance,
      });
    });

  cli
    .command('get')
    .description('Get the current balance.')
    .argument('<url>', 'The url of the Datastore.')
    .argument('<id>', 'The Credit id.')
    .action(async (url, id) => {
      const client = new DatastoreApiClient(url);
      const datastoreVersion = url.pathname.split('/').pop();
      const { balance, issuedCredits } = await client.getCreditsBalance(datastoreVersion, id);
      console.log({ issuedCredits, balance });
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
