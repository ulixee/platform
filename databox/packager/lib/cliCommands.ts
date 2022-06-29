import UlixeeConfig from '@ulixee/commons/config';
import UlixeeServerConfig from '@ulixee/commons/config/servers';
import { createInterface } from 'readline';
import * as Path from 'path';
import { existsSync } from 'fs';
import DataboxManifest from './DataboxManifest';
import DbxFile from './DbxFile';
import DataboxPackager from '../index';
import { version } from '../package.json';

export async function upload(
  dbxPath: string,
  args: {
    uploadHost?: string;
  },
): Promise<void> {
  const { uploadHost } = args;
  dbxPath = Path.resolve(dbxPath);
  const dbx = await new DbxFile(dbxPath);
  const manifest = await dbx.getEmbeddedManifest();
  await uploadPackage(dbx, manifest, uploadHost);
}

export async function unpack(dbxPath: string): Promise<void> {
  const dbx = await new DbxFile(dbxPath);
  await dbx.open();
  console.log('Unpacked %s to %s', Path.basename(dbxPath), dbx.workingDirectory);
}

export async function closeDbx(dbxPath: string, discardChanges: boolean): Promise<void> {
  const dbx = await new DbxFile(dbxPath);
  if (!discardChanges) await dbx.save();
  else await dbx.close();
}

export async function buildPackage(
  path: string,
  options: {
    tsconfig?: string;
    compiledSourcePath?: string;
    uploadHost?: string;
    upload?: boolean;
  },
): Promise<void> {
  const packager = new DataboxPackager(path);
  console.log('Building Databox ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
  });
  console.log('Rolled up and hashed Databox', {
    dbxPath: dbx.dbxPath,
    manifest: packager.manifest,
  });
  if (options.upload === true) {
    await uploadPackage(dbx, packager.manifest, options.uploadHost);
  }
}

async function uploadPackage(
  dbxFile: DbxFile,
  manifest: DataboxManifest,
  uploadHost: string,
): Promise<void> {
  uploadHost ??=
    UlixeeConfig.load()?.serverHost ??
    UlixeeConfig.global.serverHost ??
    UlixeeServerConfig.global.getVersionHost(version);

  if (!uploadHost) {
    throw new Error(
      'Could not determine a Server host from Ulixee config files. Please provide one with the `--upload-host` option.',
    );
  }

  console.log('Uploading package to %s', uploadHost, { manifest });
  try {
    await dbxFile.upload(uploadHost);
  } catch (error) {
    if (error.code === 'InvalidScriptVersionHistoryError' && error.versionHashHistory) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const projectPath = DataboxPackager.findProjectPath(dbxFile.dbxPath);
      const scriptPath = Path.join(projectPath, '..', manifest.scriptEntrypoint);
      const customManifestPath = scriptPath.replace(Path.extname(scriptPath), '-manifest.json');

      // TODO: compare tree to local tree to see how it differs and print out missing tree
      rl.question(
        `The uploaded Databox has a different version history than your local version. 
        
You must rebase onto the server version or create a new Databox manifest at:

  ${customManifestPath}
  
>> To apply the server version history to your local Databox, please type "rebase".
>> To add a custom manifest to your project, type "custom".`,
        async answer => {
          if (answer.toLowerCase().includes('rebase')) {
            await dbxFile.open();
            await manifest.rebase(error.versionHashHistory);
            await dbxFile.save();
          }
          if (answer.toLowerCase().includes('custom')) {
            if (!existsSync(scriptPath)) {
              throw new Error(
                `Could not locate a path to save a custom manifest file\n\n(tried: "${scriptPath}")`,
              );
            }
            const newManifest = new DataboxManifest(customManifestPath);
            await newManifest.update(manifest.versionTimestamp, manifest.toJSON());
            await newManifest.save();
            console.log('New manifest saved at %s', customManifestPath);
          }
          rl.close();
        },
      );
    } else {
      throw error;
    }
  }
  console.log(
    'Your Databox has been uploaded! You can test it out using the following url:\n\n%s\n\n',
    `http://${uploadHost}/databox/${manifest.scriptVersionHash}`,
  );
}
