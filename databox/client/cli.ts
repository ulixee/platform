import { Command } from 'commander';
import type * as CliCommands from '@ulixee/databox-packager/lib/cliCommands';

const { version } = require('./package.json');

export default function databoxCommands(): Command {
  const databoxCommand = new Command().version(version);

  const identityPrivateKeyPathOption = databoxCommand
    .createOption(
      '-i, --identity-path <path>',
      'A path to a Ulixee Identity. Necessary for signing if a Server has restricted allowed Uploaders.',
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
    'Upload this Databox to the given host server. Will try to auto-connect if none specified.',
  );

  const clearVersionHistoryOption = databoxCommand
    .createOption(
      '-c, --clear-version-history',
      'Clear out any version history for this script entrypoint',
    )
    .default(false);

  databoxCommand
    .command('deploy')
    .description('Build and deploy a Databox.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Databox. Must have a default export that is a DataboxWrapper.',
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
      'The path of the entrypoint to the Databox. Must have a default export that is a DataboxWrapper.',
    )
    .option(
      '-o, --out-dir <path>',
      'A directory path where you want packaged .dbx files to be saved',
    )
    .option('-u, --upload', 'Upload this package to a Ulixee Server after packaging.', false)
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
    .argument('<dbxPath>', 'The path to the packaged .dbx file.')
    .action(async dbxPath => {
      await getPackagerCommands().unpack(dbxPath);
    });

  databoxCommand
    .command('close')
    .description('Close the Databox package and save or discard the local changes.')
    .argument('<dbxPath>', 'The path to the packaged .dbx file.')
    .option('-x, --discard-changes', 'Remove the working directory without saving any changes')
    .action(async (dbxPath, { discardChanges }) => {
      await getPackagerCommands().closeDbx(dbxPath, discardChanges);
    });

  databoxCommand
    .command('upload')
    .description('Upload a Databox package to a server.')
    .argument('<dbxPath>', 'The path to the packaged .dbx file.')
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
