import { Helpers } from '@ulixee/datastore-testing';
import { ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { rootDir } from '../paths';

export default class TestMainchain {
  public address: string;
  #binPath: string;
  #process: ChildProcess;
  #interfaces: readline.Interface[] = [];

  constructor(binPath?: string) {
    this.#binPath = binPath ?? `${rootDir}/../../mainchain/target/release/ulx-node`;
    if (!fs.existsSync(this.#binPath)) {
      throw new Error(`Mainchain binary not found at ${this.#binPath}`);
    }
    Helpers.needsClosing.push({ close: () => this.teardown(), onlyCloseOnFinal: true });
  }

  public async launch(miningThreads = 4): Promise<string> {
    console.log('launching ulx-node from', path.dirname(path.resolve(this.#binPath)));
    this.#process = spawn(
      path.resolve(this.#binPath),
      ['--dev', '--alice', `--miners=${miningThreads}`, '--port=0'],
      {
        stdio: ['ignore', 'pipe', 'pipe', 'ignore'],
        env: {...process.env, RUST_LOG: 'warn,sc_rpc_server=info'}
      },
    );

    this.#process.stderr.setEncoding('utf8');
    this.#process.stdout.setEncoding('utf8');
    this.#process.stdout.on('data', data => {
      console.log('Main >> %s', data);
    });

    const int1 = readline.createInterface({ input: this.#process.stdout }).on('line', line => {
      if (line) console.log('Main >> %s', line);
    });
    this.#interfaces.push(int1);

    this.address = await new Promise<string>((resolve, reject) => {
      this.#process.on('error', err => {
        console.warn('Error running mainchain', err);
        reject(err);
      });

      const int2 = readline.createInterface({ input: this.#process.stderr }).on('line', line => {
        console.log('Main >> %s', line);
        const match = line.match(/Running JSON-RPC server: addr=127.0.0.1:(\d+)/);
        if (match) {
          resolve(`ws://127.0.0.1:${match[1]}`);
        }
      });
      this.#interfaces.push(int2);
    });
    return this.address;
  }

  public async teardown(): Promise<void> {
    this.#process?.kill();
    for (const i of this.#interfaces) {
      i.close();
    }
  }
}
