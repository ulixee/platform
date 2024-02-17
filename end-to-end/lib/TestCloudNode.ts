import { needsClosing } from '@ulixee/datastore-testing/helpers';
import { ChildProcess, spawn } from 'node:child_process';
import { getPlatformBuild } from './utils';

export default class TestCloudNode {
  address: string;
  #childProcess: ChildProcess;
  constructor(private rootDir: string = getPlatformBuild()) {
    needsClosing.push({ close: () => this.close(), onlyCloseOnFinal: true });
  }

  public async start(envArgs: Record<string, string>): Promise<string> {
    // BOOT UP A CLOUD WITH GIFT CARD RESTRICTIONS
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
    this.#childProcess?.kill();
  }
}
