import CloudCliCommands from '@ulixee/cloud/cli';
import UlixeeConfig from '@ulixee/commons/config';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import LocalUserProfile from '@ulixee/datastore/lib/LocalUserProfile';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { execSync } from 'child_process';
import * as Fs from 'fs';
import * as Path from 'path';
import { inspect } from 'util';
import DatastorePackager from '../index';
import { version } from '../package.json';
import Dbx from './Dbx';

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
      identity,
    });
    console.log('Your Datastore has been uploaded!');
  } catch (error) {
    console.error(error.message, error.stack);
    process.exit(1);
  }

  try {
    if (!Fs.existsSync(UlixeeConfig.global.directoryPath)) {
      Fs.mkdirSync(UlixeeConfig.global.directoryPath, { recursive: true });
    }
    const path = Path.join(UlixeeConfig.global.directoryPath, 'datastore-deployments.jsonl');
    await Fs.promises.appendFile(
      path,
      `${JSON.stringify(<IDatastoreDeployLogEntry>{
        scriptEntrypoint: manifest.scriptEntrypoint,
        cloudHost,
        datastoreId: manifest.id,
        version: manifest.version,
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
    extraArgs: string[];
  },
): Promise<void> {
  const packager = new DatastorePackager(path, options?.outDir, true);
  console.log('Starting Datastore ...');
  const dbx = await packager.build({
    tsconfig: options.tsconfig,
    compiledSourcePath: options.compiledSourcePath,
    watch: options.watch,
    createTemporaryVersion: true,
  });

  let host = UlixeeHostsConfig.global.getVersionHost(version);

  if (host?.startsWith('localhost')) {
    host = await UlixeeHostsConfig.global.checkLocalVersionHost(version, host);
  }

  if (!host) {
    const resolvable = new Resolvable<void>();
    CloudCliCommands({
      suppressLogs: true,
      async onStart() {
        resolvable.resolve();
      },
    }).parse(['start', ...options.extraArgs]);
    await resolvable.promise;
    host = UlixeeHostsConfig.global.getVersionHost(version);
  }
  if (!host.includes('://')) host = `ulx://${host}`;

  const client = new DatastoreApiClient(host);
  await client.startDatastore(dbx.manifest.id, dbx.path, options.watch);
  const dbxPath = dbx.path;
  ShutdownHandler.register(() => {
    Fs.rmSync(dbxPath, { recursive: true });
    return client.disconnect();
  });

  if (packager.manifest.id.startsWith('tmp')) {
    console.log(
      "Assigning a temporary id & version to your Datastore. You'll want to update your Datastore with a permanent id before deploying",
      { temporaryId: packager.manifest.id, version: '0.0.1' },
    );
  }

  console.log('%s Datastore', options.watch ? 'Started + watching' : 'Started', {
    connectionString: `${host}/${packager.manifest.id}@v${packager.manifest.version}`,
  });

  if (options.showDocs) {
    openDocsPage(packager.manifest, host);
  }
}

function openDocsPage(manifest: DatastoreManifest, cloudHost: string): void {
  let openCommand = 'xdg-open';
  if (process.platform === 'darwin') openCommand = 'open';
  if (process.platform === 'win32') openCommand = 'start';

  execSync(`${openCommand} "http://${cloudHost}/${manifest.id}@v${manifest.version}"`);
}
