import { Command } from 'commander';
import type * as CliCommands from '@ulixee/databox-packager/lib/cliCommands';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import UlixeeConfig from '@ulixee/commons/config';
import DataboxApiClient from './lib/DataboxApiClient';

const { version } = require('./package.json');

export default function databoxCommands(): Command {
  const databoxCommand = new Command().version(version);

  const identityPrivateKeyPathOption = databoxCommand
    .createOption(
      '-i, --identity-path <path>',
      'A path to a Ulixee Identity. Necessary for signing if a Miner has restricted allowed Uploaders.',
    )
    .env('ULX_IDENTITY_PATH');

  const identityPrivateKeyPassphraseOption = databoxCommand
    .createOption(
      '-p, --identity-passphrase <path>',
      'A decryption passphrase to the Ulixee identity (only necessary if specified during key creation).',
    )
    .env('ULX_IDENTITY_PASSPHRASE');

  const uploadHostOption = databoxCommand.createOption(
    '-h, --upload-host <host>',
    'Upload this Databox to the given host Miner. Will try to auto-connect if none specified.',
  );

  const clearVersionHistoryOption = databoxCommand
    .createOption(
      '-c, --clear-version-history',
      'Clear out any version history for this script entrypoint',
    )
    .default(false);

  databoxCommand
    .command('deploy')
    .description('Build and upload a Databox.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Databox. Must have a default export that is a Databox.',
    )
    .addOption(uploadHostOption)
    .addOption(clearVersionHistoryOption)
    .option(
      '-s, --compiled-source-path <path>',
      'Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).',
    )
    .option(
      '-t, --tsconfig <path>',
      'A path to a TypeScript config file if needed. Will be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .addOption(identityPrivateKeyPathOption)
    .addOption(identityPrivateKeyPassphraseOption)
    .action(async (path, args) => {
      const {
        tsconfig,
        compiledSourcePath,
        uploadHost,
        clearVersionHistory,
        identityPath,
        identityPassphrase,
      } = args;
      await getPackagerCommands().deploy(path, {
        tsconfig,
        compiledSourcePath,
        uploadHost,
        clearVersionHistory,
        identityPath,
        identityPassphrase,
      });
    });

  databoxCommand
    .command('build')
    .description('Build a Databox into a single ".dbx" file.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Databox. Must have a default export that is a Databox.',
    )
    .option('-o, --out-dir <path>', 'A directory path where you want .dbx packages to be saved')
    .option('-u, --upload', 'Upload this package to a Ulixee Miner after packaging.', false)
    .addOption(uploadHostOption)
    .addOption(clearVersionHistoryOption)
    .option(
      '-s, --compiled-source-path <path>',
      'Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).',
    )
    .option(
      '-t, --tsconfig <path>',
      'A path to a TypeScript config file if needed. Will be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .action(async (path, options) => {
      const {
        tsconfig,
        outDir,
        compiledSourcePath,
        uploadHost,
        upload,
        clearVersionHistory,
        identityPath,
        identityPassphrase,
      } = options;
      await getPackagerCommands().buildPackage(path, {
        tsconfig,
        compiledSourcePath,
        outDir,
        uploadHost,
        upload,
        clearVersionHistory,
        identityPath,
        identityPassphrase,
      });
    });

  databoxCommand
    .command('open')
    .description('Open a Databox package in the local working directory.')
    .argument('<dbxPath>', 'The path to the .dbx package.')
    .action(async dbxPath => {
      await getPackagerCommands().unpack(dbxPath);
    });

  databoxCommand
    .command('close')
    .description('Close the Databox package and save or discard the local changes.')
    .argument('<dbxPath>', 'The path to the .dbx package.')
    .option('-x, --discard-changes', 'Remove the working directory without saving any changes')
    .action(async (dbxPath, { discardChanges }) => {
      await getPackagerCommands().closeDbx(dbxPath, discardChanges);
    });

  databoxCommand
    .command('install')
    .description(
      'Install a Databox and corresponding Schema into your project. Enables type-checking for Databox.exec.',
    )
    .argument('<versionHash>', 'The version hash of the Databox.')
    .option('-a, --alias <name>', 'Add a shortcut name to reference this Databox hash.')
    .option('-h, --host <host>', 'Connect to the given host Miner. Will try to automatically connect if omitted.')
    .action(async (versionHash, { alias, host }) => {
      host ??=
        UlixeeConfig.load()?.defaultMinerHost ??
        UlixeeConfig.global.defaultMinerHost ??
        UlixeeHostsConfig.global.getVersionHost(version);

      if (!host) throw new Error('Please provide a Miner host to connect to.');

      const client = new DataboxApiClient(host);
      await client.install(versionHash, alias);
    });

  databoxCommand
    .command('upload')
    .description('Upload a Databox package to a miner.')
    .argument('<dbxPath>', 'The path to the .dbx package.')
    .addOption(uploadHostOption)
    .option(
      '-a, --allow-new-version-history',
      'Allow uploaded Databox to create a new version history for the script entrypoint.',
      false,
    )
    .action(
      async (
        packagePath,
        { uploadHost, allowNewVersionHistory, identityPath, identityPassphrase },
      ) => {
        await getPackagerCommands().upload(packagePath, {
          uploadHost,
          allowNewVersionHistory,
          identityPath,
          identityPassphrase,
        });
      },
    );

  return databoxCommand;
}

function getPackagerCommands(): typeof CliCommands {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies,global-require
    return require('@ulixee/databox-packager/lib/cliCommands');
  } catch (error) {
    throw new Error(
      `Please add @ulixee/databox-packager to your devDependencies and retry.\n\nnpm install --save-dev @ulixee/databox-packager\n\n`,
    );
  }
}
