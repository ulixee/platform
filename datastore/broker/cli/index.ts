import { applyEnvironmentVariables } from '@ulixee/commons/lib/envUtils';
import { Command } from 'commander';
import * as Path from 'path';
import Env from '../env';
import DataBroker from '../index';

const pkg = require('../package.json');

export default function cliCommands(): Command {
  const program = new Command().version(pkg.version);

  program
    .command('start', { isDefault: true })
    .description('Start a Ulixee Databroker server')
    .addOption(
      program
        .createOption(
          '-p, --port <number>',
          'The port to use. Defaults to any 1814, or any available port.',
        )
        .env('ULX_DATABROKER_PORT'),
    )
    .addOption(
      program
        .createOption(
          '-h, --hostname <hostname>',
          'The hostname the public facing apis should listen on. (default: localhost)',
        )
        .env('ULX_HOSTNAME'),
    )
    .addOption(
      program
        .createOption(
          '--admin-port <number>',
          'The port to start an admin server (datastore registry, node registry). Defaults to 18171, or any available port (0).',
        )
        .env('ULX_DATABROKER_ADMIN_PORT'),
    )
    .addOption(
      program
        .createOption(
          '--storage-dir <dir>',
          'Override the default storage directory where the Databroker databases are located.',
        )
        .env('ULX_DATABROKER_DIR'),
    )
    .addOption(program.createOption('--env <path>', 'Load environment settings from a .env file.'))
    .addOption(
      program
        .createOption(
          '--localchain-path <path>',
          'The path to the localchain data directory. You can also configure this using the .env file',
        )
        .env('ARGON_LOCALCHAIN_PATH'),
    )
    .allowUnknownOption(true)
    .action(async opts => {
      console.log('Starting Ulixee Databroker with configuration:', opts);
      const { port, hostname, adminPort, localChainPath, env } = opts;
      if (env) {
        applyEnvironmentVariables(Path.resolve(env), process.env);
      }

      if (localChainPath) {
        Env.localchainConfig ??= {};
        Env.localchainConfig.localchainPath ??= localChainPath;
      }

      const server = new DataBroker({
        storageDir: opts.storageDir ?? Env.storageDir,
        localchainConfig: Env.localchainConfig,
      });
      await server.listen(port, hostname);
      await server.listenAdmin(adminPort);

      console.log(
        'Databroker listening at %s. Admin server at: %s',
        await server.host,
        await server.adminHost,
      );
    });

  return program;
}
