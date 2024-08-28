import { customAlphabet } from 'nanoid';
import { Client } from 'pg';
import * as child_process from 'node:child_process';
import { checkForExtrinsicSuccess, Keyring, KeyringPair, ArgonClient } from '@argonprotocol/mainchain';
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import * as process from 'node:process';
import { Helpers } from '@ulixee/datastore-testing';
import { rootDir } from '../paths';
import { cleanHostForDocker, getDockerPortMapping, getProxy } from './testHelpers';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);
export default class TestNotary {
  public operator: KeyringPair;
  public ip = '127.0.0.1';
  public registeredPublicKey: Uint8Array;
  public port: string;
  public containerName?: string;
  public proxy?: string;
  public logLevel = 'warn';
  #dbName: string;
  #dbConnectionString: string;
  #childProcess: child_process.ChildProcessWithoutNullStreams;
  #stdioInterface: readline.Interface;

  public get address(): string {
    if (this.proxy) {
      const url = new URL(this.proxy);
      url.searchParams.set('target', `ws://${this.ip}:${this.port}`);
      return url.href;
    }
    return `ws://${this.ip}:${this.port}`;
  }

  constructor(dbConnectionString?: string) {
    this.#dbConnectionString =
      dbConnectionString ??
      process.env.NOTARY_DB_URL ??
      'postgres://postgres:postgres@localhost:5432';
  }

  /**
   * Returns the localhost address of the notary (NOTE: not accessible from containers)
   */
  public async start(mainchainUrl: string, pathToNotaryBin?: string): Promise<string> {
    this.operator = new Keyring({ type: 'sr25519' }).createFromUri('//Bob');
    this.registeredPublicKey = new Keyring({ type: 'ed25519' }).createFromUri(
      '//Ferdie//notary',
    ).publicKey;

    let notaryPath = pathToNotaryBin ?? `${rootDir}/../../mainchain/target/debug/argon-notary`;
    if (process.env.ULX_USE_DOCKER_BINS) {
      this.containerName = `notary_${nanoid()}`;
      const addHost = process.env.ADD_DOCKER_HOST
        ? ` --add-host=host.docker.internal:host-gateway`
        : '';

      notaryPath = `docker run --rm -p=0:9925${addHost} --name=${this.containerName} -e RUST_LOG=${this.logLevel} ghcr.io/argonprotocol/argon-notary:dev`;

      this.#dbConnectionString = cleanHostForDocker(this.#dbConnectionString);
    } else if (!fs.existsSync(notaryPath)) {
      throw new Error(`Notary binary not found at ${notaryPath}`);
    }

    const client = await this.connect();
    try {
      let tries = 10;
      let dbName = '';
      while (tries > 0) {
        const uid = nanoid();
        dbName = `notary_${uid}`;
        // check if the db path  notary_{id} exists
        const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (result.rowCount === 0) {
          break;
        }
        tries -= 1;
      }
      this.#dbName = dbName;
      await client.query(`CREATE DATABASE "${dbName}"`);
    } finally {
      await client.end();
    }

    console.log(`${notaryPath} migrate --db-url ${this.#dbConnectionString}/${this.#dbName}`);
    const result = child_process.execSync(
      `${notaryPath} migrate --db-url ${this.#dbConnectionString}/${this.#dbName}`,
      {
        encoding: 'utf-8',
      },
    );
    if (result.trim().length) {
      console.log(result.trim());
    }
    console.log(
      "Notary >> connecting to mainchain '%s', db %s",
      mainchainUrl,
      `${this.#dbConnectionString}/${this.#dbName}`,
    );

    const execArgs = [
      'run',
      `--db-url=${this.#dbConnectionString}/${this.#dbName}`,
      `--dev`,
      `-t ${mainchainUrl}`,
    ];
    if (process.env.ULX_USE_DOCKER_BINS) {
      execArgs.unshift(...notaryPath.replace('docker run', 'run').split(' '));
      execArgs.push('-b=0.0.0.0:9925');

      notaryPath = 'docker';
    }

    console.log(notaryPath, execArgs.join(' '));
    this.#childProcess = child_process.spawn(notaryPath, execArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, RUST_LOG: this.logLevel },
    });
    Helpers.needsClosing.push({ close: () => this.teardown(), onlyCloseOnFinal: true });
    this.#childProcess.stdout.setEncoding('utf8');
    this.#childProcess.stderr.setEncoding('utf8');
    this.port = await new Promise<string>((resolve, reject) => {
      const onProcessError = (err: Error): void => {
        console.warn('Error running notary', err);
        reject(err);
      };
      this.#childProcess.once('error', onProcessError);
      this.#childProcess.stderr.on('data', data => {
        console.warn('Notary >> %s', data);
        if (data.startsWith('WARNING')) return;
        this.#childProcess.off('error', onProcessError);
        reject(data);
      });
      this.#stdioInterface = readline
        .createInterface({ input: this.#childProcess.stdout })
        .on('line', line => {
          console.log('Notary >> %s', line);
          const match = line.match(/Listening on ([ws:/\d.]+)/);
          if (match) {
            resolve(match[1].split(':').pop());
          }
        });
    });
    this.#childProcess.on('error', err => {
      throw err;
    });
    if (this.containerName) {
      this.port = await getDockerPortMapping(this.containerName, 9925);
      this.proxy = cleanHostForDocker(await getProxy());
    }

    return this.address;
  }

  public async register(client: ArgonClient): Promise<void> {
    const address = new URL(this.address);

    await new Promise<void>(async (resolve, reject) => {
      await client.tx.notaries
        .propose({
          public: this.registeredPublicKey,
          hosts: [address.href],
        })
        .signAndSend(this.operator, ({ events, status }) => {
          if (status.isInBlock) {
            void checkForExtrinsicSuccess(events, client).then(() => {
              console.log(
                `Successful proposal of notary in block ${status.asInBlock.toHex()}`,
                status.type,
              );
              resolve();
              return null;
            }, reject);
          } else {
            console.log(`Status of notary proposal: ${status.type}`);
          }
        });
    });
  }

  public async teardown(): Promise<void> {
    const launchedProcess = this.#childProcess;
    if (launchedProcess) {
      launchedProcess?.kill();
      try {
        launchedProcess.stdio.forEach(io => io?.destroy());
      } catch {}
      launchedProcess.unref();
    }
    this.#stdioInterface?.close();
    const client = await this.connect();
    try {
      await client.query(`DROP DATABASE "${this.#dbName}" WITH (FORCE)`);
    } finally {
      await client.end();
    }
    if (this.containerName) {
      try {
        child_process.execSync(`docker rm -f ${this.containerName}`);
      } catch {}
    }
  }

  async connect(): Promise<Client> {
    const client = new Client({ connectionString: this.#dbConnectionString });
    try {
      await client.connect();
    } catch (err) {
      console.error('ERROR connecting to postgres client', err);
      throw err;
    }
    return client;
  }
}
