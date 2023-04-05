import { Command } from 'commander';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import { applyEnvironmentVariables, parseEnvBool } from '@ulixee/commons/lib/envUtils';
import * as Path from 'path';
import { parseIdentities } from '@ulixee/datastore-core/env';
import { CloudNode } from '../index';
import CloudNodeEnv from '../env';

const pkg = require('../package.json');

export default function cliCommands(): Command {
  const program = new Command().version(pkg.version);

  program
    .command('start', { isDefault: true })
    .description('start a Ulixee CloudNode')
    .addOption(
      program
        .createOption('-p, --port <number>', 'The port to use. Defaults to any available port.')
        .env('PORT'),
    )
    .addOption(
      program.createOption(
        '-h, --host <host>',
        'The host the Cloud node should listen on. (default: localhost)',
      ),
    )
    .addOption(
      program.createOption('-e, --env <file>', 'Load environment settings from a .env file.'),
    )
    .addOption(
      program
        .createOption(
          '-a, --admin-identities',
          'Your admin identity public ids (starting with id1)',
        )
        .env('ULX_CLOUD_ADMIN_IDENTITIES'),
    )
    .addOption(
      program
        .createOption(
          '-x, --disable-chrome-alive',
          'Do not enable ChromeAlive! even if installed locally.',
        )
        .argParser(parseEnvBool)
        .env('ULX_DISABLE_CHROMEALIVE'),
    )
    .addOption(
      program
        .createOption(
          '-m, --max-concurrent-heroes <count>',
          'Max number of concurrent Datastores/Heroes to run at a time.',
        )
        .argParser(parseInt)
        .default(10),
    )
    .addOption(
      program
        .createOption(
          '-r, --max-datastore-runtime-ms <millis>',
          'Max runtime allowed for a Datastore to complete. (default: 10 mins)',
        )
        .argParser(parseInt),
    )
    .addOption(
      program.createOption(
        '-u, --unblocked-plugins <plugins...>',
        'Register default Unblocked Plugin npm module names for all Hero instances to load.',
      ),
    )
    .addOption(
      program
        .createOption(
          '-d, --hero-data-dir <dir>',
          'Override the default data directory for Hero sessions and dbs.',
        )
        .env('ULX_DATA_DIR'),
    )
    .addOption(
      program
        .createOption(
          '-s, --datastore-storage-dir <dir>',
          'Override the default storage directory where Datastores are located.',
        )
        .env('ULX_DATASTORE_DIR'),
    )
    .addOption(
      program.createOption(
        '-t, --datastore-tmp-dir <dir>',
        'Override the default temp directory where uploaded Datastores are processed.',
      ),
    )
    .addOption(
      program
        .createOption(
          '-w, --datastore-wait-for-completion',
          'Wait for all in-process Datastores to complete before shutting down the Cloud node.',
        )
        .default(false),
    )
    .allowUnknownOption(true)
    .action(async opts => {
      console.log('Starting Ulixee Cloud with configuration:', opts);
      const { port, disableChromeAlive, host, env } = opts;
      if (env) {
        applyEnvironmentVariables(Path.resolve(env), process.env);
      }
      if (disableChromeAlive) CloudNodeEnv.disableChromeAlive = disableChromeAlive;

      const cloudNode = new CloudNode(host);

      const { unblockedPlugins, heroDataDir, maxConcurrentHeroes } = opts;
      cloudNode.router.heroConfiguration = filterUndefined({
        maxConcurrentClientCount: maxConcurrentHeroes,
        dataDir: heroDataDir,
        defaultUnblockedPlugins: unblockedPlugins?.map(x => {
          // eslint-disable-next-line import/no-dynamic-require
          const mod: any = require(x);
          if (mod.default) return mod.default;
          return mod;
        }),
      });

      cloudNode.router.datastoreConfiguration = filterUndefined({
        datastoresDir: opts.datastoreStorageDir,
        datastoresTmpDir: opts.datastoreTmpDir,
        maxRuntimeMs: opts.maxDatastoreRuntimeMs,
        waitForDatastoreCompletionOnShutdown: opts.datastoreWaitForCompletion,
        adminIdentities: parseIdentities(opts.adminIdentities, 'Admin Identities'),
      });

      await cloudNode.listen({ port });
      console.log('Ulixee Cloud listening at %s', await cloudNode.address);
    });

  return program;
}
