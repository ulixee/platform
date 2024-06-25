import { needsClosing } from '@ulixee/datastore-testing/helpers';
import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import HttpTransportToCore from '@ulixee/net/lib/HttpTransportToCore';
import { ChildProcess, spawn } from 'node:child_process';
import { IDatabrokerAdminApis, IDatabrokerApis } from '@ulixee/platform-specification/datastore';
import { Helpers } from '@ulixee/datastore-testing';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { getPlatformBuild } from './utils';

export default class TestDatabroker {
  address: string;
  adminAddress: string;

  #childProcess: ChildProcess;
  constructor(private rootDir: string = getPlatformBuild()) {
    needsClosing.push({ close: () => this.close(), onlyCloseOnFinal: true });
  }

  public async start(envArgs: {
    ULX_DATABROKER_DIR?: string;
    ULX_DATABROKER_PORT?: string;
    ULX_MAINCHAIN_URL?: string;
    ULX_LOCALCHAIN_PATH?: string;
  }): Promise<string> {
    this.#childProcess = spawn(`npx @ulixee/databroker start`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: this.rootDir,
      shell: true,
      env: {
        ...process.env,
        DEBUG: 'ulx*',
        ...envArgs,
      },
    });

    this.#childProcess.stdout.setEncoding('utf8');
    this.#childProcess.stderr.setEncoding('utf8');
    const ports = await new Promise<[string, string]>((resolve, reject) => {
      let isResolved = false;
      const onProcessError = (err: Error): void => {
        console.warn('[DATABROKER] Error running cloud node', err);
        reject(err);
        isResolved = true;
      };
      this.#childProcess.once('error', onProcessError);
      this.#childProcess.stderr.on('data', data => {
        console.warn('[DATABROKER] >> %s', data);
        this.#childProcess.off('error', onProcessError);
        reject(data);
        isResolved = true;
      });
      this.#childProcess.stdout.on('data', data => {
        console.log('[DATABROKER]', data.trim());
        if (isResolved) return;
        const match = data.match(/Databroker listening at .*:(\d+). Admin server at: .+:(\d+)/);
        if (match?.length) {
          resolve([match[1], match[2]]);
          isResolved = true;
        }
      });
    });
    this.address = `http://localhost:${ports[0]}`;
    this.adminAddress = `ws://localhost:${ports[1]}`;
    this.#childProcess.on('error', err => {
      throw err;
    });
    this.#childProcess.on('exit', code => {
      console.warn('[DATABROKER] Server exited with code', code);
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

  public async whitelistDomain(domain: string): Promise<void> {
    const adminTransport = new WsTransportToCore(this.adminAddress);
    const adminConnection = new ConnectionToCore<IDatabrokerAdminApis, any>(adminTransport);
    Helpers.onClose(() => adminConnection.disconnect());
    await adminConnection.sendRequest({
      command: 'WhitelistedDomains.add',
      args: [{ domain }],
    });
    await adminConnection.disconnect();
  }

  public async registerUser(identityPath: string, amount: bigint): Promise<void> {
    const adminTransport = new WsTransportToCore(this.adminAddress);
    const adminConnection = new ConnectionToCore<IDatabrokerAdminApis, any>(adminTransport);
    Helpers.onClose(() => adminConnection.disconnect());
    const { id } = await adminConnection.sendRequest({
      command: 'Organization.create',
      args: [
        {
          balance: amount,
        },
      ],
    });

    const identity = Identity.loadFromFile(identityPath).bech32;
    await adminConnection.sendRequest({
      command: 'User.create',
      args: [
        {
          identity,
          organizationId: id,
        },
      ],
    });

    await adminConnection.disconnect();
  }

  public async getBalance(identity: string): Promise<bigint> {
    const adminTransport = new HttpTransportToCore(this.address);
    const adminConnection = new ConnectionToCore<IDatabrokerApis, any>(adminTransport);
    const { balance } = await adminConnection.sendRequest({
      command: 'Databroker.getBalance',
      args: [{ identity }],
    });
    return balance;
  }
}
