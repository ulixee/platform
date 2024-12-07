import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
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
  #events = new EventSubscriber();

  #childProcess: ChildProcess;
  constructor(private rootDir: string = getPlatformBuild()) {
    needsClosing.push({ close: () => this.close(), onlyCloseOnFinal: true });
  }

  public async start(envArgs: {
    ULX_DATABROKER_DIR?: string;
    ULX_DATABROKER_PORT?: string;
    ARGON_MAINCHAIN_URL?: string;
    ARGON_LOCALCHAIN_PATH?: string;
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
      const onError = this.#events.once(this.#childProcess, 'error', (err: Error): void => {
        console.warn('[DATABROKER] Error running cloud node', err);
        reject(err);
        isResolved = true;
      });
      this.#events.on(this.#childProcess.stderr, 'data', data => {
        console.warn('[DATABROKER] >> %s', data);
        this.#events.off(onError);
        reject(data);
        isResolved = true;
      });
      this.#events.on(this.#childProcess.stdout, 'data', data => {
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
    this.#events.on(this.#childProcess, 'error', err => {
      throw err;
    });
    this.#events.on(this.#childProcess, 'exit', code => {
      console.warn('[DATABROKER] Server exited with code', code);
    });
    return this.address;
  }

  public async close(): Promise<void> {
    if (!this.#childProcess) return;
    this.#events.close();
    const launchedProcess = this.#childProcess;
    launchedProcess.stderr.destroy();
    launchedProcess.stdout.destroy();
    launchedProcess.kill();
    this.#childProcess = null;
  }

  public async whitelistDomain(domain: string): Promise<void> {
    const adminTransport = new WsTransportToCore(this.adminAddress);
    const adminConnection = new ConnectionToCore<IDatabrokerAdminApis, any>(adminTransport);
    Helpers.onClose(() => adminConnection.disconnect());
    await adminConnection.connect();
    await adminConnection.sendRequest({
      command: 'WhitelistedDomains.add',
      args: [{ domain }],
    });
    console.log('[DATABROKER] Whitelisted domain', domain);
    await adminConnection.disconnect();
  }

  public async registerUser(identityPath: string, amount: bigint): Promise<void> {
    console.log('[DATABROKER] Registering user with balance', amount, this.adminAddress);
    const adminTransport = new WsTransportToCore(this.adminAddress);
    const adminConnection = new ConnectionToCore<IDatabrokerAdminApis, any>(adminTransport);
    Helpers.onClose(() => adminConnection.disconnect());
    await adminConnection.connect();
    await new Promise(setImmediate);
    const { id } = await adminConnection.sendRequest(
      {
        command: 'Organization.create',
        args: [
          {
            name: 'Test Organization',
            balance: amount,
          },
        ],
      },
      10e3,
    );

    const identity = Identity.loadFromFile(identityPath).bech32;

    console.log('[DATABROKER] Registering user', identity);
    await adminConnection.sendRequest(
      {
        command: 'User.create',
        args: [
          {
            identity,
            organizationId: id,
          },
        ],
      },
      10e3,
    );
    console.log('[DATABROKER] Registered user', identity);
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
