import { Command } from 'commander';
import type * as CliCommands from '@ulixee/datastore-packager/lib/cliCommands';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import * as Path from 'path';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import DatastoreApiClient from '../lib/DatastoreApiClient';
import creditsCli from './creditsCli';
import cloneDatastore from './cloneDatastore';

const { version } = require('../package.json');

export default function datastoreCommands(): Command {
  const cli = new Command().version(version);

  const identityPrivateKeyPathOption = cli
    .createOption(
      '-i, --identity-path <path>',
      'A path to an Admin Identity. Necessary for actions restricting access to Admins of a Datastore.',
    )
    .env('ULX_IDENTITY_PATH');

  const identityPrivateKeyPassphraseOption = cli
    .createOption(
      '-p, --identity-passphrase <path>',
      'A decryption passphrase to the Ulixee Admin Identity (only necessary if specified during key creation).',
    )
    .env('ULX_IDENTITY_PASSPHRASE');

  cli
    .command('clone')
    .description('Clone and add onto a Datastore.')
    .argument('<url>', 'The url of the Datastore.')
    .argument('[path]', 'The directory path to output your cloned Datastore.')
    .action(async (url, path) => {
      console.log('Cloning...');
      const { datastoreFilePath } = await cloneDatastore(url, path);
      console.log('Your cloned datastore has been created.', {
        path: Path.dirname(datastoreFilePath),
        startCommand: `npx @ulixee/datastore start "${Path.relative(process.cwd(), datastoreFilePath)}"`,
      });
    });

  cli
    .command('build')
    .description('Build a Datastore and compress into a TarGz file.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Datastore. Must have a default export that is a Datastore.',
    )
    .option('-o, --out-dir <path>', 'A directory path where you want the compressed dbx to go.')
    .option(
      '-s, --compiled-source-path <path>',
      'Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).',
    )
    .option(
      '-t, --tsconfig <path>',
      'A path to a TypeScript config file if needed. Will be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .action(async (path, options) => {
      const { tsconfig, outDir, compiledSourcePath } = options;
      await getPackagerCommands().build(path, {
        tsconfig,
        compiledSourcePath,
        outDir,
      });
    });

  cli
    .command('deploy')
    .description('Build and upload a Datastore.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Datastore. Must have a default export that is a Datastore.',
    )
    .option(
      '-h, --cloud-host <host>',
      'Upload this Datastore to the given host Cloud node. Will try to auto-connect if none specified.',
    )
    .option(
      '-c, --clear-version-history',
      'Clear out any version history for this script entrypoint',
      false,
    )
    .option(
      '-s, --compiled-source-path <path>',
      'Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).',
    )
    .option(
      '-t, --tsconfig <path>',
      'A path to a TypeScript config file if needed. Will be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .option('-d, --no-docs', "Don't automatically display the deployed documentation website.")
    .addOption(identityPrivateKeyPathOption)
    .addOption(identityPrivateKeyPassphraseOption)
    .action(async (path, args) => {
      const {
        tsconfig,
        compiledSourcePath,
        cloudHost,
        clearVersionHistory,
        identityPath,
        identityPassphrase,
        noDocs,
      } = args;
      await getPackagerCommands().deploy(path, {
        tsconfig,
        compiledSourcePath,
        cloudHost,
        clearVersionHistory,
        identityPath,
        identityPassphrase,
        dontAutoshowDocs: noDocs,
      });
    });

  cli
    .command('start')
    .description('Start a Datastore.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Datastore. Must have a default export that is a Datastore.',
    )
    .option(
      '-o, --out-dir <path>',
      'A path where you want a .dbx working directory to be created. Defaults to the <entrypoint>.dbx',
    )
    .option(
      '-s, --compiled-source-path <path>',
      'Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).',
    )
    .option(
      '-t, --tsconfig <path>',
      'A path to a TypeScript config file if needed. Will be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .option('-w, --watch', 'Watch for file changes in your datastore.')
    .action(async (path, options) => {
      const { tsconfig, outDir, compiledSourcePath, watch } = options;

      await getPackagerCommands().startDatastore(path, {
        tsconfig,
        compiledSourcePath,
        outDir,
        watch,
      });
    });

  cli
    .command('install')
    .description(
      'Install a Datastore and corresponding Schema into your project. Enables type-checking for Datastore.query.',
    )
    .argument('<versionHash>', 'The version hash of the Datastore.')
    .option('-a, --alias <name>', 'Add a shortcut name to reference this Datastore hash.')
    .option(
      '-h, --host <host>',
      'Connect to the given Cloud node host. Will try to automatically connect if omitted.',
    )
    .action(async (versionHash, { alias, host }) => {
      host ??= UlixeeHostsConfig.global.getVersionHost(version);

      if (!host) throw new Error('Please provide a Cloud host to connect to.');

      const client = new DatastoreApiClient(host);
      await client.install(versionHash, alias);
    });

  cli.addCommand(creditsCli());
  return cli;
}

function getPackagerCommands(): typeof CliCommands {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies,global-require
    return require('@ulixee/datastore-packager/lib/cliCommands');
  } catch (error) {
    throw new Error(
      `Please add @ulixee/datastore-packager to your devDependencies and retry.\n\nnpm install --save-dev @ulixee/datastore-packager\n\n`,
    );
  }
}
