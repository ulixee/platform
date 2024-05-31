import { Helpers } from '@ulixee/datastore-testing';
import { customAlphabet } from 'nanoid';
import { ChildProcess, execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { rootDir } from '../paths';
import { cleanHostForDocker, getDockerPortMapping, getProxy } from './testHelpers';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

export default class TestMainchain {
  public ip = '127.0.0.1';
  public port: string;
  public loglevel = 'warn';
  #binPath: string;
  #bitcoind: ChildProcess;
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
    this.#binPath = binPath ?? `${rootDir}/../../mainchain/target/debug/ulx-node`;
    this.#binPath = path.resolve(this.#binPath);
    if (!process.env.ULX_USE_DOCKER_BINS && !fs.existsSync(this.#binPath)) {
      throw new Error(`Mainchain binary not found at ${this.#binPath}`);
    }
    Helpers.needsClosing.push({ close: () => this.teardown(), onlyCloseOnFinal: true });
  }

  public async launch(miningThreads = 4): Promise<string> {
    let port = 0;
    let rpcPort = 0;
    let execArgs: string[] = [];

    let containerName: string;
    if (process.env.ULX_USE_DOCKER_BINS) {
      containerName = `miner_${nanoid()}`;
      this.containerName = containerName;
      this.#binPath = 'docker';
      port = 9944;
      rpcPort = 33344;
      execArgs = [
        'run',
        '--rm',
        `--name=${containerName}`,
        `-p=0:${port}`,
        `-p=0:${rpcPort}`,
        '-e',
        `RUST_LOG=${this.loglevel},sc_rpc_server=info`,
        'ghcr.io/ulixee/ulixee-miner:dev',
      ];
      if (process.env.ADD_DOCKER_HOST) {
        execArgs.splice(2, 0, `--add-host=host.docker.internal:host-gateway`);
      }

      const bitcoinRpcUrl = await this.startBitcoin();
      execArgs.push(
        '--dev',
        '--alice',
        `--miners=${miningThreads}`,
        `--port=${port}`,
        `--rpc-port=${rpcPort}`,
        '--rpc-external',
        `--bitcoin-rpc-url=${bitcoinRpcUrl}`,
      );
    }
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
      this.port = await getDockerPortMapping(this.containerName, 9944);
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
    this.#bitcoind?.kill();
    this.#process?.kill();
    for (const i of this.#interfaces) {
      i.close();
    }
  }

  private async startBitcoin(): Promise<string> {
    // const rpcPort = await PortFinder.getPortPromise();
    //
    // const tmpDir = fs.mkdtempSync('/tmp/ulx-bitcoin-');
    //
    // this.#bitcoind = spawn(
    //   process.env.BITCOIND_PATH,
    //   [
    //     '-regtest',
    //     '-fallbackfee=0.0001',
    //     '-listen=0',
    //     `-datadir=${tmpDir}`,
    //     '-blockfilterindex',
    //     '-txindex',
    //     `-rpcport=${rpcPort}`,
    //     '-rpcuser=bitcoin',
    //     '-rpcpassword=bitcoin',
    //   ],
    //   {
    //     stdio: ['ignore', 'inherit', 'inherit', 'ignore'],
    //   },
    // );

    return cleanHostForDocker(`http://bitcoin:bitcoin@localhost:${14388}`);
  }
}
