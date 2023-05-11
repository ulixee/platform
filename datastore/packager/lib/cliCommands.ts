import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { createInterface } from 'readline';
import * as Path from 'path';
import * as Fs from 'fs';
import { existsSync } from 'fs';
import { inspect } from 'util';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import { IVersionHistoryEntry } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { findProjectPathSync } from '@ulixee/commons/lib/dirUtils';
import LocalUserProfile from '@ulixee/datastore/lib/LocalUserProfile';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import { CloudNode } from '@ulixee/cloud';
import { execSync } from 'child_process';
import UlixeeConfig from '@ulixee/commons/config';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import Dbx from './Dbx';
import DatastorePackager from '../index';
import { version } from '../package.json';

inspect.defaultOptions.depth = 10;

export async function build(
  path: string,
  options: {
    outDir?: string;
    tsconfig?: string;
    compiledSourcePath?: string;
  },
): Promise<void> {
  const packager = new DatastorePackager(path, options?.outDir, true);
  console.log('Building Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
  });

  const compressed = await dbx.tarGzip();
  Fs.writeFileSync(`${dbx.path}.tgz`, compressed);
  Fs.rmSync(dbx.path, { recursive: true });
}

export async function deploy(
  entrypoint: string,
  options: {
    tsconfig?: string;
    compiledSourcePath?: string;
    clearVersionHistory?: boolean;
    cloudHost?: string;
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
  console.log('Uploading...');
  const result = await upload(
    dbx,
    packager.manifest,
    options.cloudHost,
    options.clearVersionHistory,
    options.identityPath,
    options.identityPassphrase,
  );

  if (!options.dontAutoshowDocs) {
    openDocsPage(packager.manifest, result.cloudHost);
  }

  if (!dbxExists) {
    await Fs.promises.rm(packager.dbxPath, { recursive: true });
  }
}

async function upload(
  dbx: Dbx,
  manifest: DatastoreManifest,
  cloudHost: string,
  clearVersionHistory: boolean,
  identityPath: string | undefined,
  identityPassphrase: string | undefined,
): Promise<{ cloudHost: string }> {
  cloudHost ??= UlixeeHostsConfig.global.getVersionHost(version);

  if (cloudHost?.startsWith('localhost')) {
    cloudHost = await UlixeeHostsConfig.global.checkLocalVersionHost(version, cloudHost);
    if (!identityPath) {
      const localProfile = new LocalUserProfile();
      identityPath = localProfile.defaultAdminIdentityPath;
    }
  }

  if (!cloudHost) {
    throw new Error(
      'Could not determine a Cloud host from Ulixee config files. Please provide one with the `--cloud-host` option.',
    );
  }

  let identity: Identity;
  if (identityPath) {
    identity = Identity.loadFromFile(identityPath, {
      keyPassphrase: identityPassphrase,
    });
  }

  console.log('Uploading Datastore to %s', cloudHost, {
    manifest: manifest.toJSON(),
  });
  try {
    await dbx.upload(cloudHost, {
      allowNewLinkedVersionHistory: clearVersionHistory,
      identity,
    });
    console.log('Your Datastore has been uploaded!');
  } catch (error) {
    console.log(error);
    if (error.code === 'InvalidScriptVersionHistoryError' && error.versionHistory) {
      handleInvalidScriptVersionHistory(manifest, dbx, error.versionHistory, cloudHost);
    } else if (error.code === 'MissingLinkedScriptVersionsError' && error.previousVersions) {
      handleMissingLinkedVersions(manifest, dbx, error.previousVersions, cloudHost);
    } else {
      console.error(error.message, error.stack);
      process.exit(1);
    }
  }

  try {
    const path = Path.join(UlixeeConfig.global.directoryPath, 'datastore-deployments.jsonl');
    await Fs.promises.appendFile(
      path,
      `${JSON.stringify(<IDatastoreDeployLogEntry>{
        scriptEntrypoint: manifest.scriptEntrypoint,
        cloudHost,
        versionHash: manifest.versionHash,
        adminIdentity: identity?.bech32,
        timestamp: manifest.versionTimestamp,
      })}\n`,
    );
  } catch {}
  return { cloudHost };
}

export async function startDatastore(
  path: string,
  options: {
    outDir?: string;
    tsconfig?: string;
    compiledSourcePath?: string;
    watch?: boolean;
    showDocs?: boolean;
  },
): Promise<void> {
  const packager = new DatastorePackager(path, options?.outDir, true);
  console.log('Starting Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
    watch: options.watch,
    createTemporaryVersionHash: true,
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
  if (!host.includes('://')) host = `ulx://${host}`;

  const client = new DatastoreApiClient(host);
  await client.startDatastore(dbx.path, options.watch);
  const dbxPath = dbx.path;
  ShutdownHandler.register(() => {
    console.log('removing dir', dbxPath);
    Fs.rmSync(dbxPath, { recursive: true });
    return client.disconnect();
  });

  console.log('%s Datastore', options.watch ? 'Started + watching' : 'Started', {
    connectionString: `${host}/${packager.manifest.versionHash}`,
  });

  if (options.showDocs) {
    openDocsPage(packager.manifest, host);
  }
}

function openDocsPage(manifest: DatastoreManifest, cloudHost: string): void {
  let url = `http://${cloudHost}/${manifest.versionHash}/`;
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
  cloudHost: string,
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
        await dbxFile.upload(cloudHost);
        console.log('Your Datastore has been linked to the Cloud version!');
      }
      if (answer.toLowerCase().includes('new')) {
        await dbxFile.upload(cloudHost, { allowNewLinkedVersionHistory: true });
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
  cloudHost: string,
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
        await dbxFile.upload(cloudHost);
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
          manifest.extractorsByName,
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
