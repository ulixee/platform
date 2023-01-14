import { Command } from 'commander';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import DatastoreApiClient from '../lib/DatastoreApiClient';
import CreditsStore from '../lib/CreditsStore';

export default function creditsCli(): Command {
  const cli = new Command('credits');
  cli
    .command('create')
    .description('Create Credits for a User to try out your Datastore.')
    .argument('<url>', 'The url to the Datastore.')
    .requiredOption(
      '-m, --amount <value>',
      'The value of this Credit. Amount can postfix "c" for centagons (eg, 50c) or "m" for microgons (5000000m).',
      /\d+[mc]?/,
    )
    .requiredOption('-i, --identity <idBech32String>', 'You administration identity keypair.')
    .action(async (url, { identity, amount }) => {
      const parsedUrl = new URL(url);
      const client = new DatastoreApiClient(parsedUrl.origin);
      const microgons = ArgonUtils.parseUnits(amount, 'microgons');
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
      const parsedUrl = new URL(url);
      const client = new DatastoreApiClient(parsedUrl.origin);
      const [datastoreVersion, id] = parsedUrl.pathname.split('/credit/');
      const { balance } = await client.getCreditsBalance(datastoreVersion, id);
      await CreditsStore.store(parsedUrl.origin, datastoreVersion.replace(/\//g, ''), {
        id,
        secret,
        remainingCredits: balance,
      });
    });

  cli.command('get').description('Get the current balance and holds.');
  return cli;
}
