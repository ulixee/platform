import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { createInterface } from 'readline';
import * as Path from 'path';
import * as Fs from 'fs';
import { existsSync } from 'fs';
import { inspect } from 'util';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import { IVersionHistoryEntry } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { findProjectPathSync } from '@ulixee/commons/lib/dirUtils';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import { CloudNode } from '@ulixee/cloud';
import { execSync } from 'child_process';
import Dbx from './Dbx';
import DatastorePackager from '../index';
import { version } from '../package.json';

inspect.defaultOptions.depth = 10;

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
  const dbxExists = await existsAsync(packager.dbxPath);
  console.log('Building Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
  });
  const manifest = dbx.manifest;

  let uploadHost = options.uploadHost ?? UlixeeHostsConfig.global.getVersionHost(version);

  if (uploadHost?.startsWith('localhost')) {
    uploadHost = await UlixeeHostsConfig.global.checkLocalVersionHost(version, uploadHost);
  }

  if (!uploadHost) {
    throw new Error(
      'Could not determine a Cloud host from Ulixee config files. Please provide one with the `--upload-host` option.',
    );
  }

  const { identityPath, identityPassphrase } = options;
  let identity: Identity;
  if (identityPath) {
    identity = Identity.loadFromFile(identityPath, {
      keyPassphrase: identityPassphrase,
    });
  }

  console.log('Uploading Datastore to %s', uploadHost, {
    manifest: manifest.toJSON(),
  });
  try {
    await dbx.upload(uploadHost, {
      allowNewLinkedVersionHistory: options.clearVersionHistory,
      identity,
    });
    console.log('Your Datastore has been uploaded!');
  } catch (error) {
    if (error.code === 'InvalidScriptVersionHistoryError' && error.versionHistory) {
      handleInvalidScriptVersionHistory(manifest, dbx, error.versionHistory, uploadHost);
    } else if (error.code === 'MissingLinkedScriptVersionsError' && error.previousVersions) {
      handleMissingLinkedVersions(manifest, dbx, error.previousVersions, uploadHost);
    } else {
      console.error(error.message, error.stack);
      process.exit(1);
    }
  }

  if (!options.dontAutoshowDocs) {
    openDocsPage(packager.manifest, uploadHost);
  }

  if (!dbxExists) {
    await Fs.promises.rm(packager.dbxPath, { recursive: true });
  }
}

export async function startDatastore(
  path: string,
  options: {
    outDir?: string;
    tsconfig?: string;
    compiledSourcePath?: string;
    watch?: boolean;
  },
): Promise<void> {
  const packager = new DatastorePackager(path, options?.outDir, true);
  console.log('Starting Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
    watch: options.watch,
  });

  let host = UlixeeHostsConfig.global.getVersionHost(version);

  if (host?.startsWith('localhost')) {
    host = await UlixeeHostsConfig.global.checkLocalVersionHost(version, host);
  }

  if (!host) {
    const cloudNode = new CloudNode();
    await cloudNode.listen();
    host = UlixeeHostsConfig.global.getVersionHost(version);
  }
  const startLocation = '...';
  console.log('Started Datastore at %s.', startLocation, {
    dbxPath: dbx.path,
    manifest: packager.manifest.toJSON(),
  });
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
  dbxFile: Dbx,
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
        const projectPath = findProjectPathSync(dbxFile.path);
        const absoluteScriptPath = Path.join(projectPath, '..', manifest.scriptEntrypoint);
        await manifest.setLinkedVersions(absoluteScriptPath, versionHistory);
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
  dbxFile: Dbx,
  versionHistory: IVersionHistoryEntry[],
  uploadHost: string,
): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const projectPath = findProjectPathSync(dbxFile.path);
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
        await manifest.setLinkedVersions(absoluteScriptPath, versionHistory);
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
          'New manifest saved at %s. Please modify the manifest as needed and re-deploy your Datastore.',
          customManifestPath,
        );
      }
      rl.close();
    },
  );
}
