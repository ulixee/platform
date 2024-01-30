import { applyEnvironmentVariables, parseEnvBool } from '@ulixee/commons/lib/envUtils';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import { parseIdentities } from '@ulixee/datastore-core/env';
import { Command } from 'commander';
import * as Path from 'path';
import CloudNodeEnv from '../env';
import { CloudNode } from '../index';

const pkg = require('../package.json');

export default function cliCommands(): Command {
  const program = new Command().version(pkg.version);

  program
    .command('start', { isDefault: true })
    .description('start a Ulixee CloudNode')
    .addOption(
      program
        .createOption(
          '-p, --port <number>',
          'The port to use. Defaults to any 1818, or any available port.',
        )
        .env('PORT'),
    )
    .addOption(
      program
        .createOption(
          '-h, --hostname <hostname>',
          'The hostname the Cloud node should listen on. (default: localhost)',
        )
        .env('ULX_HOSTNAME'),
    )
    .addOption(
      program
        .createOption(
          '--hosted-services-port <number>',
          'Activate hosted services on this node at this port (datastore registry, node registry). Defaults to any 18181, or any available port (0).',
        )
        .env('ULX_HOSTED_SERVICES_PORT'),
    )
    .addOption(
      program
        .createOption(
          '--hosted-services-hostname <hostname>',
          'The ip or host that Cluster Services should listed on. You should make this a private-to-your-cloud ip if possible. (default: localhost)',
        )
        .env('ULX_HOSTED_SERVICES_HOSTNAME'),
    )
    .addOption(
      program
        .createOption(
          '--setup-host <host>',
          'Setup services for this node with another node in your cluster. NOTE: this should be the hosted services address of your cluster node.',
        )
        .env('ULX_SERVICES_SETUP_HOST'),
    )
    .addOption(program.createOption('--env <path>', 'Load environment settings from a .env file.'))
    .addOption(
      program
        .createOption(
          '--network-identity-path <path>',
          'Filesystem path to your network identity keypair',
        )
        .env('ULX_NETWORK_IDENTITY_PATH'),
    )
    .addOption(
      program
        .createOption(
          '--admin-identities <ids...>',
          'Your admin identity public ids (starting with id1)',
        )
        .env('ULX_CLOUD_ADMIN_IDENTITIES'),
    )
    .addOption(
      program
        .createOption(
          '--disable-chrome-alive',
          'Do not enable ChromeAlive! even if installed locally.',
        )
        .argParser(parseEnvBool)
        .env('ULX_DISABLE_CHROMEALIVE'),
    )
    .addOption(
      program
        .createOption(
          '--max-concurrent-heroes <count>',
          'Max number of concurrent Datastores/Heroes to run at a time.',
        )
        .argParser(parseInt)
        .default(10),
    ).addOption(
    program
      .createOption(
        '--max-concurrent-heroes-per-browser <count>',
        'Max number of concurrent Heroes to run per Chrome instance.',
      )
      .argParser(parseInt)
      .default(10),
  )
    .addOption(
      program
        .createOption(
          '--max-datastore-runtime-ms <millis>',
          'Max runtime allowed for a Datastore to complete. (default: 10 mins)',
        )
        .argParser(parseInt),
    )
    .addOption(
      program.createOption(
        '--unblocked-plugins <plugins...>',
        'Register default Unblocked Plugin npm module names for all Hero instances to load.',
      ),
    )
    .addOption(
      program
        .createOption(
          '--hero-data-dir <dir>',
          'Override the default data directory for Hero sessions and dbs.',
        )
        .env('ULX_DATA_DIR'),
    )
    .addOption(
      program
        .createOption(
          '--datastore-storage-dir <dir>',
          'Override the default storage directory where Datastores are located.',
        )
        .env('ULX_DATASTORE_DIR'),
    )
    .addOption(
      program.createOption(
        '--datastore-tmp-dir <dir>',
        'Override the default temp directory where uploaded Datastores are processed.',
      ),
    )
    .addOption(
      program
        .createOption(
          '--datastore-wait-for-completion',
          'Wait for all in-process Datastores to complete before shutting down the Cloud node.',
        )
        .default(false),
    )
    .allowUnknownOption(true)
    .action(async opts => {
      console.log('Starting Ulixee Cloud with configuration:', opts);
      const {
        port,
        disableChromeAlive,
        hostname,
        setupHost,
        hostedServicesPort,
        hostedServicesHostname,
        env,
      } = opts;
      if (env) {
        applyEnvironmentVariables(Path.resolve(env), process.env);
      }
      if (disableChromeAlive) CloudNodeEnv.disableChromeAlive = disableChromeAlive;

      const { unblockedPlugins, heroDataDir, maxConcurrentHeroes, maxConcurrentHeroesPerBrowser } = opts;

      const cloudNode = new CloudNode(
        filterUndefined({
          port,
          host: hostname,
          hostedServicesServerOptions:
            !!hostedServicesHostname || hostedServicesPort !== undefined
              ? { port: hostedServicesPort, host: hostedServicesHostname }
              : undefined,
          servicesSetupHost: setupHost,
          heroConfiguration: filterUndefined({
            maxConcurrentClientCount: maxConcurrentHeroes,
            maxConcurrentClientsPerBrowser: maxConcurrentHeroesPerBrowser,
            dataDir: heroDataDir,
            defaultUnblockedPlugins: unblockedPlugins?.map(x => {
              // eslint-disable-next-line import/no-dynamic-require
              const mod: any = require(x);
              if (mod.default) return mod.default;
              return mod;
            }),
          }),
          datastoreConfiguration: filterUndefined({
            datastoresDir: opts.datastoreStorageDir,
            datastoresTmpDir: opts.datastoreTmpDir,
            maxRuntimeMs: opts.maxDatastoreRuntimeMs,
            waitForDatastoreCompletionOnShutdown: opts.datastoreWaitForCompletion,
            adminIdentities: parseIdentities(opts.adminIdentities, 'Admin Identities'),
          }),
        }),
      );
      await cloudNode.listen();
      console.log('Ulixee Cloud listening at %s', await cloudNode.address);
    });

  return program;
}
