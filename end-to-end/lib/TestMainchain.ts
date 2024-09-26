import { Helpers } from '@ulixee/datastore-testing';
import {
  checkForExtrinsicSuccess,
  KeyringPair,
  ArgonClient,
  ArgonPrimitivesDomainVersionHost,
} from '@argonprotocol/mainchain';
import { customAlphabet } from 'nanoid';
import { ChildProcess, execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as readline from 'node:readline';
import { rootDir } from '../paths';
import { cleanHostForDocker, getDockerPortMapping, getProxy } from './testHelpers';
import TestNotary from './TestNotary';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

export default class TestMainchain {
  public ip = '127.0.0.1';
  public port: string;
  public loglevel = 'warn';
  #binPath: string;
  #process: ChildProcess;
  #interfaces: readline.Interface[] = [];
  containerName?: string;
  proxy?: string;

  public get address(): string {
    if (this.proxy) {
      const url = new URL(this.proxy);
      url.searchParams.set('target', `ws://${this.ip}:${this.port}`);
      return url.href;
    }
    return `ws://${this.ip}:${this.port}`;
  }

  constructor(binPath?: string) {
    this.#binPath = binPath ?? `${rootDir}/../../mainchain/target/debug/argon-node`;
    this.#binPath = path.resolve(this.#binPath);
    if (!process.env.ULX_USE_DOCKER_BINS && !fs.existsSync(this.#binPath)) {
      throw new Error(`Mainchain binary not found at ${this.#binPath}`);
    }
    Helpers.needsClosing.push({ close: () => this.teardown(), onlyCloseOnFinal: true });
  }

  /**
   * Launch and return the localhost url. NOTE: this url will not work cross-docker. You need to use the containerAddress property
   * @param miningThreads
   */
  public async launch(miningThreads = os.cpus().length - 1): Promise<string> {
    let port = 0;
    let rpcPort = 0;
    if (miningThreads === 0) miningThreads = 1;
    let execArgs: string[] = [];
    let containerName: string;
    if (process.env.ULX_USE_DOCKER_BINS) {
      containerName = `miner_${nanoid()}`;
      this.containerName = containerName;
      this.#binPath = 'docker';
      port = 33344;
      rpcPort = 9944;
      execArgs = [
        'run',
        '--rm',
        `--name=${containerName}`,
        `-p=0:${port}`,
        `-p=0:${rpcPort}`,
        '-e',
        `RUST_LOG=${this.loglevel},sc_rpc_server=info`,
        'ghcr.io/argonprotocol/argon-miner:dev',
      ];

      if (process.env.ADD_DOCKER_HOST) {
        execArgs.splice(2, 0, `--add-host=host.docker.internal:host-gateway`);
      }
    }

    const bitcoinRpcUrl = await this.startBitcoin();
    execArgs.push(
      '--dev',
      '--alice',
      `--compute-miners=${miningThreads}`,
      `--port=${port}`,
      `--rpc-port=${rpcPort}`,
      '--rpc-external',
      `--bitcoin-rpc-url=${bitcoinRpcUrl}`,
    );
    this.#process = spawn(this.#binPath, execArgs, {
      stdio: ['ignore', 'pipe', 'pipe', 'ignore'],
      env: { ...process.env, RUST_LOG: `${this.loglevel},sc_rpc_server=info` },
    });

    this.#process.stderr.setEncoding('utf8');
    this.#process.stdout.setEncoding('utf8');
    this.#process.stdout.on('data', data => {
      console.log('Main >> %s', data);
    });

    const int1 = readline.createInterface({ input: this.#process.stdout }).on('line', line => {
      if (line) console.log('Main >> %s', line);
    });
    this.#interfaces.push(int1);

    this.port = await new Promise<string>((resolve, reject) => {
      this.#process.on('error', err => {
        console.warn('Error running mainchain', err);
        reject(err);
      });

      const int2 = readline.createInterface({ input: this.#process.stderr }).on('line', line => {
        console.log('Main >> %s', line);
        const match = line.match(/Running JSON-RPC server: addr=([\d.:]+)/);
        if (match) {
          resolve(match[1].split(':').pop());
        }
      });
      this.#interfaces.push(int2);
    });
    if (this.containerName) {
      this.port = await getDockerPortMapping(this.containerName, rpcPort);
      this.proxy = cleanHostForDocker(await getProxy());
    }

    console.log(`Ulx Node listening at ${this.address}`);
    return this.address;
  }

  public async teardown(): Promise<void> {
    if (process.env.ULX_USE_DOCKER_BINS) {
      try {
        execSync(`docker rm -f ${this.containerName}`);
      } catch {}
    }
    const launchedProcess = this.#process;
    if (launchedProcess) {
      launchedProcess?.kill();
      try {
        launchedProcess.stdio.forEach(io => io?.destroy());
      } catch {}
      launchedProcess.unref();
    }
    for (const i of this.#interfaces) {
      i.close();
    }
  }

  private async startBitcoin(): Promise<string> {
    const rpcPort = 14338;
    // const rpcPort = await PortFinder.getPortPromise();
    //
    // const path = child_process.execSync(`${__dirname}/../../target/debug/ulx-testing-bitcoin`, {encoding: 'utf8'}).trim();
    //
    // const tmpDir = fs.mkdtempSync('/tmp/ulx-bitcoin-');
    //
    // this.#bitcoind = spawn(path, ['-regtest', '-fallbackfee=0.0001', '-listen=0', `-datadir=${tmpDir}`, '-blockfilterindex', '-txindex', `-rpcport=${rpcPort}`, '-rpcuser=bitcoin', '-rpcpassword=bitcoin'], {
    //     stdio: ['ignore', 'inherit', 'inherit', "ignore"],
    // });

    // return a fake url - not part of testing localchain
    return cleanHostForDocker(`http://bitcoin:bitcoin@localhost:${rpcPort}`);
  }
}

export async function registerZoneRecord(
  client: ArgonClient,
  domainHash: Uint8Array,
  owner: KeyringPair,
  paymentAccount: Uint8Array,
  notaryId: number,
  versions: Record<string, ArgonPrimitivesDomainVersionHost>,
): Promise<void> {
  const codecVersions = new Map();
  for (const [version, host] of Object.entries(versions)) {
    const [major, minor, patch] = version.split('.');
    const versionCodec = client.createType('ArgonPrimitivesDomainSemver', {
      major,
      minor,
      patch,
    });
    codecVersions.set(versionCodec, client.createType('ArgonPrimitivesDomainVersionHost', host));
  }

  await new Promise((resolve, reject) => {
    return client.tx.domain
      .setZoneRecord(domainHash, {
        paymentAccount,
        notaryId,
        versions: codecVersions,
      })
      .signAndSend(owner, ({ events, status }) => {
        if (status.isFinalized) {
          checkForExtrinsicSuccess(events, client).then(resolve).catch(reject);
        }
        if (status.isInBlock) {
          checkForExtrinsicSuccess(events, client).catch(reject);
        }
      })
      .catch(reject);
  });
}

export async function activateNotary(
  sudo: KeyringPair,
  client: ArgonClient,
  notary: TestNotary,
): Promise<void> {
  await notary.register(client);
  await new Promise<void>((resolve, reject) => {
    void client.tx.sudo
      .sudo(client.tx.notaries.activate(notary.operator.publicKey))
      .signAndSend(sudo, ({ events, status }) => {
        if (status.isInBlock) {
          // eslint-disable-next-line promise/always-return
          return checkForExtrinsicSuccess(events, client).then(() => {
            console.log(`Successful activation of notary in block ${status.asInBlock.toHex()}`);
            resolve();
          }, reject);
        }
        console.log(`Status of notary activation: ${status.type}`);
      });
  });
}
