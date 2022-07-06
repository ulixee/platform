import UlixeeConfig from '@ulixee/commons/config';
import UlixeeServerConfig from '@ulixee/commons/config/servers';
import { createInterface } from 'readline';
import * as Path from 'path';
import { existsSync } from 'fs';
import { inspect } from 'util';
import DataboxManifest from '@ulixee/databox-core/lib/DataboxManifest';
import IDataboxManifest, {
  IVersionHistoryEntry,
} from '@ulixee/databox-interfaces/IDataboxManifest';
import { findProjectPathSync } from '@ulixee/commons/lib/dirUtils';
import DbxFile from './DbxFile';
import DataboxPackager from '../index';
import { version } from '../package.json';

inspect.defaultOptions.depth = 10;

export async function upload(
  dbxPath: string,
  args: {
    uploadHost?: string;
    allowNewVersionHistory?: boolean;
  },
): Promise<void> {
  const { uploadHost } = args;
  dbxPath = Path.resolve(dbxPath);
  const dbx = await new DbxFile(dbxPath);
  const manifest = await dbx.getEmbeddedManifest();
  await uploadPackage(dbx, manifest, uploadHost, args.allowNewVersionHistory);
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
    clearVersionHistory?: boolean;
    uploadHost?: string;
    upload?: boolean;
  },
): Promise<void> {
  const packager = new DataboxPackager(path, true);
  console.log('Building Databox ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
  });
  if (options.upload === true) {
    console.log('Rolled up and hashed Databox', {
      dbxPath: dbx.dbxPath,
    });
    await uploadPackage(dbx, packager.manifest, options.uploadHost, options.clearVersionHistory);
  } else {
    console.log('Rolled up and hashed Databox. The .dbx file was not uploaded to a server.', {
      dbxPath: dbx.dbxPath,
      manifest: packager.manifest.toJSON(),
    });
  }
}

async function uploadPackage(
  dbxFile: DbxFile,
  manifest: DataboxManifest,
  uploadHost: string,
  clearVersionHistory: boolean,
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

  console.log('Uploading package to %s', uploadHost, {
    manifest: manifest.toJSON(),
  });
  try {
    await dbxFile.upload(uploadHost, clearVersionHistory);
    printUploadedMessage(uploadHost, manifest);
  } catch (error) {
    if (error.code === 'InvalidScriptVersionHistoryError' && error.versionHistory) {
      handleInvalidScriptVersionHistory(manifest, dbxFile, error.versionHistory, uploadHost);
    } else if (error.code === 'MissingLinkedScriptVersionsError' && error.previousVersions) {
      handleMissingLinkedVersions(manifest, dbxFile, error.previousVersions, uploadHost);
    } else {
      console.error(error.message, error.stack);
      process.exit(1);
    }
  }
}

function printUploadedMessage(uploadHost: string, manifest: IDataboxManifest): void {
  console.log(
    'Your Databox has been uploaded! You can test it out using the following url:\n\n%s\n\n',
    `http://${uploadHost}/databox/${manifest.versionHash}`,
  );
}

function handleMissingLinkedVersions(
  manifest: DataboxManifest,
  dbxFile: DbxFile,
  versionHistory: IVersionHistoryEntry[],
  uploadHost: string,
): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    `You uploaded a script without any linked versions, but the entrypoint "${manifest.scriptEntrypoint}" matches an existing Databox on the server. 
        
>> To link versions on the server with your local Databox, please type "link".
>> To create a new version list, please type "new".

`,
    async answer => {
      if (answer.toLowerCase().includes('link')) {
        await dbxFile.open();
        await manifest.setLinkedVersions(versionHistory);
        await dbxFile.save();
        await dbxFile.upload(uploadHost);
        printUploadedMessage(uploadHost, manifest);
      }
      if (answer.toLowerCase().includes('new')) {
        await dbxFile.upload(uploadHost, true);
        printUploadedMessage(uploadHost, manifest);
      }
      rl.close();
    },
  );
}

function handleInvalidScriptVersionHistory(
  manifest: DataboxManifest,
  dbxFile: DbxFile,
  versionHistory: IVersionHistoryEntry[],
  uploadHost: string,
): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const projectPath = findProjectPathSync(dbxFile.dbxPath);
  const scriptPath = Path.join(projectPath, '..', manifest.scriptEntrypoint);
  const customManifestPath = scriptPath.replace(Path.extname(scriptPath), '-manifest.json');

  // TODO: compare tree to local tree to see how it differs and print out missing tree
  rl.question(
    `The uploaded Databox has a different version history than your local version. 
        
You can choose from the options below to link to the existing server versions or create a new Databox manifest at:

  ${customManifestPath}
  
>> To link the version history on the server with your local Databox, please type "link".
>> To add a custom manifest to your project, type "custom".

`,
    async answer => {
      if (answer.toLowerCase().includes('link')) {
        await dbxFile.open();
        await manifest.setLinkedVersions(versionHistory);
        await dbxFile.save();
        await dbxFile.upload(uploadHost);
        printUploadedMessage(uploadHost, manifest);
      }
      if (answer.toLowerCase().includes('custom')) {
        if (!existsSync(scriptPath)) {
          throw new Error(
            `Could not locate a path to save a custom manifest file\n\n(tried: "${scriptPath}")`,
          );
        }
        const newManifest = new DataboxManifest(customManifestPath);
        await newManifest.update(
          manifest.versionHash,
          manifest.scriptEntrypoint,
          manifest.versionTimestamp,
          manifest.runtimeName,
          manifest.runtimeVersion,
          console.log,
        );
        await newManifest.save();
        console.log(
          'New manifest saved at %s. Please modify the manifest as needed and rebuild your Databox.',
          customManifestPath,
        );
      }
      rl.close();
    },
  );
}
