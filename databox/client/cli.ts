import { Command } from 'commander';
import * as Path from 'path';
import type Packager from '@ulixee/databox-packager';
import UlixeeConfig from '@ulixee/commons/config';
import UlixeeServerConfig from '@ulixee/commons/config/servers';

const { version } = require('./package.json');

export default function databoxCommands(): Command {
  const databoxCommand = new Command().version(version);

  databoxCommand
    .command('package')
    .description('Package a Databox into a single file and generate a manifest.')
    .argument(
      '<path>',
      'The path of the entrypoint to the Databox. Must have a default export that is a DataboxWrapper.',
    )
    .option('-u, --upload', 'Upload this package to a Ulixee Server after packaging.', false)
    .option(
      '-h, --upload-host',
      'Upload this package to the given host server. Will try to auto-connect if none specified.',
    )
    .option(
      '-o, --output-dir',
      'A directory to output the file to. Defaults to a `.databox` directory next to the input file.',
    )
    .option(
      '-t, --tsconfig',
      'A path to a TypeScript config file if needed. Will attempt to be auto-located based on the entrypoint if it ends in ".ts"',
    )
    .action(async (path, { tsconfig, outputDir, uploadHost, upload }) => {
      path = Path.resolve(path);
      const packager = getPackager(path, outputDir);
      await packager.build({ tsconfig });
      console.log('Rolled up and hashed Databox', {
        outputPath: packager.outputPath,
        manifest: packager.package.manifest,
      });
      if (upload === true) {
        await uploadPackage(packager, uploadHost);
      }
    });

  databoxCommand
    .command('upload')
    .description('Upload an already packaged Databox to a server.')
    .argument('<packagePath>', 'The path to the packaged Databox and manifest.')
    .option(
      '-u, --upload-host',
      'Upload this package to the given host server. Will try to auto-connect if none specified.',
    )
    .action(async (packagePath, { uploadHost }) => {
      packagePath = Path.resolve(packagePath);
      const packager = getPackager('', packagePath);
      await packager.loadPackage();
      await uploadPackage(packager, uploadHost);
    });

  return databoxCommand;
}

function getPackager(path: string, outputPath: string): Packager {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const PackagerClass: typeof Packager = require('@ulixee/databox-packager').default;
    return new PackagerClass(path, { outputPath });
  } catch (error) {
    throw new Error(
      `Please add @ulixee/databox-packager to your devDependencies and retry.\n\nnpm install --save-dev @ulixee/databox-packager\n\n`,
    );
  }
}

async function uploadPackage(packager: Packager, uploadHost: string): Promise<void> {
  uploadHost ??=
    UlixeeConfig.load()?.serverHost ??
    UlixeeConfig.global.serverHost ??
    UlixeeServerConfig.global.getVersionHost(version);

  if (!uploadHost) {
    throw new Error(
      'Could not determine a Server host from Ulixee config files. Please provide one with the `--upload-host` option.',
    );
  }

  console.log('Uploading manifest to %s', uploadHost, { manifest: packager.package.manifest });
  await packager.upload(uploadHost);
  console.log(
    'Your Databox has been uploaded! You can test it out using the following url:\n\n%s\n\n',
    `http://${uploadHost}/databox/${packager.package.manifest.scriptRollupHash}`,
  );
}
