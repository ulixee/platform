import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { createInterface } from 'readline';
import * as Path from 'path';
import { existsSync } from 'fs';
import { inspect } from 'util';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import { IVersionHistoryEntry } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { findProjectPathSync } from '@ulixee/commons/lib/dirUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import { execSync } from 'child_process';
import DbxFile from './DbxFile';
import DatastorePackager from '../index';
import { version } from '../package.json';

inspect.defaultOptions.depth = 10;

export async function upload(
  dbxPath: string,
  args: {
    uploadHost?: string;
    allowNewVersionHistory?: boolean;
    identityPath?: string;
    identityPassphrase?: string;
  },
): Promise<void> {
  const { uploadHost } = args;
  dbxPath = Path.resolve(dbxPath);
  const dbx = await new DbxFile(dbxPath);
  const manifest = await dbx.getEmbeddedManifest();
  await uploadPackage(
    dbx,
    manifest,
    uploadHost,
    args.allowNewVersionHistory,
    args.identityPath,
    args.identityPassphrase,
  );
}

export async function deploy(
  entrypoint: string,
  options: {
    tsconfig?: string;
    compiledSourcePath?: string;
    clearVersionHistory?: boolean;
    uploadHost?: string;
    identityPath?: string;
    identityPassphrase?: string;
    dontAutoshowDocs?: boolean;
  },
): Promise<void> {
  const packager = new DatastorePackager(entrypoint, null, true);
  console.log('Building Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
  });
  console.log('Uploading...');
  const result = await uploadPackage(
    dbx,
    packager.manifest,
    options.uploadHost,
    options.clearVersionHistory,
    options.identityPath,
    options.identityPassphrase,
  );

  if (!options.dontAutoshowDocs) {
    openDocsPage(packager.manifest, result.uploadHost);
  }

  await dbx.delete();
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
    outDir?: string;
    tsconfig?: string;
    compiledSourcePath?: string;
    clearVersionHistory?: boolean;
    uploadHost?: string;
    upload?: boolean;
    identityPath?: string;
    identityPassphrase?: string;
    dontAutoshowDocs?: boolean;
  },
): Promise<void> {
  const packager = new DatastorePackager(path, options?.outDir, true);
  console.log('Building Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
  });
  if (options.upload === true) {
    console.log('Rolled up and hashed Datastore', {
      dbxPath: dbx.dbxPath,
    });
    const result = await uploadPackage(
      dbx,
      packager.manifest,
      options.uploadHost,
      options.clearVersionHistory,
      options.identityPath,
      options.identityPassphrase,
    );
    if (!options.dontAutoshowDocs) {
      openDocsPage(packager.manifest, result.uploadHost);
    }
  } else {
    console.log('Rolled up and hashed Datastore. The .dbx file was not uploaded to a Cloud.', {
      dbxPath: dbx.dbxPath,
      manifest: packager.manifest.toJSON(),
    });
  }
}

async function uploadPackage(
  dbxFile: DbxFile,
  manifest: DatastoreManifest,
  uploadHost: string,
  clearVersionHistory: boolean,
  identityPath: string | undefined,
  identityPassphrase: string | undefined,
): Promise<{ uploadHost: string }> {
  if (!uploadHost) {
    uploadHost = UlixeeHostsConfig.global.getVersionHost(version);

    if (uploadHost?.startsWith('localhost')) {
      uploadHost = await UlixeeHostsConfig.global.checkLocalVersionHost(version, uploadHost);
    }
  }

  if (!uploadHost) {
    throw new Error(
      'Could not determine a Cloud host from Ulixee config files. Please provide one with the `--upload-host` option.',
    );
  }
  let identity: Identity;
  if (identityPath) {
    identity = Identity.loadFromFile(identityPath, {
      keyPassphrase: identityPassphrase,
    });
  }

  console.log('Uploading package to %s', uploadHost, {
    manifest: manifest.toJSON(),
  });
  try {
    await dbxFile.upload(uploadHost, {
      allowNewLinkedVersionHistory: clearVersionHistory,
      identity,
    });
    console.log('Your Datastore has been uploaded!');
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
  return { uploadHost };
}

function openDocsPage(manifest: DatastoreManifest, uploadHost: string): void {
  let url = `http://${uploadHost}/datastore/${manifest.versionHash}/`;
  if (manifest.domain) url = `http://${manifest.domain}/`;
  let openCommand = 'xdg-open';
  if (process.platform === 'darwin') openCommand = 'open';
  if (process.platform === 'win32') openCommand = 'start';

  execSync(`${openCommand} ${url}`);
}

function handleMissingLinkedVersions(
  manifest: DatastoreManifest,
  dbxFile: DbxFile,
  versionHistory: IVersionHistoryEntry[],
  uploadHost: string,
): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    `You uploaded a script without any linked versions, but the entrypoint "${manifest.scriptEntrypoint}" matches an existing Datastore on the Cloud. 
        
>> To link versions on the Cloud with your local Datastore, please type "link".
>> To create a new version list, please type "new".

`,
    async answer => {
      if (answer.toLowerCase().includes('link')) {
        await dbxFile.open();
        const projectPath = findProjectPathSync(dbxFile.dbxPath);
        const absoluteScriptPath = Path.join(projectPath, '..', manifest.scriptEntrypoint);
        await manifest.setLinkedVersions(absoluteScriptPath, versionHistory);
        await dbxFile.save();
        await dbxFile.upload(uploadHost);
        console.log('Your Datastore has been linked to the Cloud version!');
      }
      if (answer.toLowerCase().includes('new')) {
        await dbxFile.upload(uploadHost, { allowNewLinkedVersionHistory: true });
        console.log('Your updated Datastore has been uploaded with a new history.');
      }
      rl.close();
    },
  );
}

function handleInvalidScriptVersionHistory(
  manifest: DatastoreManifest,
  dbxFile: DbxFile,
  versionHistory: IVersionHistoryEntry[],
  uploadHost: string,
): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const projectPath = findProjectPathSync(dbxFile.dbxPath);
  const absoluteScriptPath = Path.join(projectPath, '..', manifest.scriptEntrypoint);
  const customManifestPath = absoluteScriptPath.replace(
    Path.extname(absoluteScriptPath),
    '-manifest.json',
  );

  rl.question(
    `The uploaded Datastore has a different version history than your local version. 
        
You can choose from the options below to link to the existing Cloud versions or create a new Datastore manifest at:

  ${customManifestPath}
  
>> To link the version history on the Cloud with your local Datastore, please type "link".
>> To add a custom manifest to your project, type "custom".

`,
    async answer => {
      if (answer.toLowerCase().includes('link')) {
        await dbxFile.open();
        await manifest.setLinkedVersions(absoluteScriptPath, versionHistory);
        await dbxFile.save();
        await dbxFile.upload(uploadHost);
        console.log(
          'Your updated Datastore has been uploaded and linked to the Cloud version history!',
        );
      }
      if (answer.toLowerCase().includes('custom')) {
        if (!existsSync(Path.dirname(absoluteScriptPath))) {
          throw new Error(
            `Could not locate a path to save a custom manifest file\n\n(tried: "${absoluteScriptPath}")`,
          );
        }
        const newManifest = new DatastoreManifest(customManifestPath);
        await newManifest.update(
          absoluteScriptPath,
          manifest.scriptHash,
          manifest.versionTimestamp,
          manifest.schemaInterface,
          manifest.runnersByName,
          manifest.crawlersByName,
          manifest.tablesByName,
          manifest,
          console.log,
        );
        await newManifest.save();
        console.log(
          'New manifest saved at %s. Please modify the manifest as needed and rebuild your Datastore.',
          customManifestPath,
        );
      }
      rl.close();
    },
  );
}
