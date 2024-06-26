import { needsClosing } from '@ulixee/datastore-testing/helpers';
import { ChildProcess, spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import * as Path from 'node:path';
import IDatastoreManifest from '@ulixee/platform-specification/types/IDatastoreManifest';
import { execAndLog, getPlatformBuild } from './utils';

export default class TestCloudNode {
  address: string;
  #childProcess: ChildProcess;
  constructor(private rootDir: string = getPlatformBuild()) {
    needsClosing.push({ close: () => this.close(), onlyCloseOnFinal: true });
  }

  public async start(envArgs: Record<string, string>): Promise<string> {
    this.#childProcess = spawn(`npx @ulixee/cloud start`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: this.rootDir,
      shell: true,
      env: {
        ...process.env,
        ULX_DISABLE_CHROMEALIVE: 'true',
        DEBUG: 'ulx*',
        ...envArgs,
      },
    });

    this.#childProcess.stdout.setEncoding('utf8');
    this.#childProcess.stderr.setEncoding('utf8');
    this.address = await new Promise<string>((resolve, reject) => {
      let isResolved = false;
      const onProcessError = (err: Error): void => {
        console.warn('[DATASTORE CORE] Error running cloud node', err);
        reject(err);
        isResolved = true;
      };
      this.#childProcess.once('error', onProcessError);
      this.#childProcess.stderr.on('data', data => {
        console.warn('[DATASTORE CORE] >> %s', data);
        this.#childProcess.off('error', onProcessError);
        reject(data);
        isResolved = true;
      });
      this.#childProcess.stdout.on('data', data => {
        console.log('[DATASTORE CORE]', data.trim());
        if (isResolved) return;
        const match = data.match(/Ulixee Cloud listening at (.+)/);
        if (match?.length) {
          resolve(match[1]);
          isResolved = true;
        }
      });
    });
    this.#childProcess.on('error', err => {
      throw err;
    });
    this.#childProcess.on('exit', code => {
      console.warn('[DATASTORE CORE] Cloud node exited with code', code);
    });
    return this.address;
  }

  public async close(): Promise<void> {
    if (!this.#childProcess) return;
    const launchedProcess = this.#childProcess;
    launchedProcess.stdout.destroy();
    launchedProcess.stderr.destroy();
    launchedProcess.kill('SIGKILL');
    launchedProcess.unref();
  }
}

export async function uploadDatastore(
  id: string,
  buildDir: string,
  cloudAddress: string,
  manifest: Partial<IDatastoreManifest>,
  identityPath: string,
): Promise<void> {
  const datastorePath = Path.join('end-to-end', 'test', 'datastore', `${id}.js`);
  await writeFile(
    Path.join(buildDir, datastorePath.replace('.js', '-manifest.json')),
    JSON.stringify(manifest),
  );
  execAndLog(
    `npx @ulixee/datastore deploy --skip-docs -h ${cloudAddress} .${Path.sep}${datastorePath}`,
    {
      cwd: buildDir,
      env: {
        ...process.env,
        ULX_IDENTITY_PATH: identityPath,
      },
    },
  );
}
