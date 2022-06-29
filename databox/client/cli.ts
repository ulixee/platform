import { Command } from 'commander';
import type * as CliCommands from '@ulixee/databox-packager/lib/cliCommands';

const { version } = require('./package.json');

export default function databoxCommands(): Command {
  const databoxCommand = new Command().version(version);

  databoxCommand
    .command('build')
    .description('Build a Databox into a single ".dbx" file and generate a manifest.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Databox. Must have a default export that is a DataboxWrapper.',
    )
    .option('-u, --upload', 'Upload this package to a Ulixee Server after packaging.', false)
    .option(
      '-h, --upload-host <host>',
      'Upload this package to the given host server. Will try to auto-connect if none specified.',
    )
    .option(
      '-s, --compiled-source-path <path>',
      'Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).',
    )
    .option(
      '-t, --tsconfig <path>',
      'A path to a TypeScript config file if needed. Will attempt to be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .action(async (path, { tsconfig, compiledSourcePath, uploadHost, upload }) => {
      await getPackagerCommands().buildPackage(path, {
        tsconfig,
        compiledSourcePath,
        uploadHost,
        upload,
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
    .option(
      '-x, --discard-changes',
      'The working for the given .dbx file. Defaults to a `.dbx.build/[scriptFilename]` directory next to the dbx file.',
    )
    .action(async (dbxPath, { discardChanges }) => {
      await getPackagerCommands().closeDbx(dbxPath, discardChanges);
    });

  databoxCommand
    .command('upload')
    .description('Upload a Databox package to a server.')
    .argument('<dbxPath>', 'The path to the packaged .dbx file.')
    .option(
      '-u, --upload-host <host>',
      'Upload this package to the given host server. Will try to auto-connect if none specified.',
    )
    .action(async (packagePath, { uploadHost }) => {
      await getPackagerCommands().upload(packagePath, { uploadHost });
    });

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
