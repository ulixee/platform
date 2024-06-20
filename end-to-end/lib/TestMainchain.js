"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TestMainchain_binPath, _TestMainchain_bitcoind, _TestMainchain_process, _TestMainchain_interfaces;
Object.defineProperty(exports, "__esModule", { value: true });
const datastore_testing_1 = require("@ulixee/datastore-testing");
const nanoid_1 = require("nanoid");
const node_child_process_1 = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const paths_1 = require("../paths");
const testHelpers_1 = require("./testHelpers");
const nanoid = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyz', 4);
class TestMainchain {
    get address() {
        if (this.proxy) {
            const url = new URL(this.proxy);
            url.searchParams.set('target', `ws://${this.ip}:${this.port}`);
            return url.href;
        }
        return `ws://${this.ip}:${this.port}`;
    }
    constructor(binPath) {
        this.ip = '127.0.0.1';
        this.loglevel = 'warn';
        _TestMainchain_binPath.set(this, void 0);
        _TestMainchain_bitcoind.set(this, void 0);
        _TestMainchain_process.set(this, void 0);
        _TestMainchain_interfaces.set(this, []);
        __classPrivateFieldSet(this, _TestMainchain_binPath, binPath ?? `${paths_1.rootDir}/../../mainchain/target/debug/ulx-node`, "f");
        __classPrivateFieldSet(this, _TestMainchain_binPath, path.resolve(__classPrivateFieldGet(this, _TestMainchain_binPath, "f")), "f");
        if (!process.env.ULX_USE_DOCKER_BINS && !fs.existsSync(__classPrivateFieldGet(this, _TestMainchain_binPath, "f"))) {
            throw new Error(`Mainchain binary not found at ${__classPrivateFieldGet(this, _TestMainchain_binPath, "f")}`);
        }
        datastore_testing_1.Helpers.needsClosing.push({ close: () => this.teardown(), onlyCloseOnFinal: true });
    }
    async launch(miningThreads = 4) {
        let port = 0;
        let rpcPort = 0;
        let execArgs = [];
        let containerName;
        if (process.env.ULX_USE_DOCKER_BINS) {
            containerName = `miner_${nanoid()}`;
            this.containerName = containerName;
            __classPrivateFieldSet(this, _TestMainchain_binPath, 'docker', "f");
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
            execArgs.push('--dev', '--alice', `--miners=${miningThreads}`, `--port=${port}`, `--rpc-port=${rpcPort}`, '--rpc-external', `--bitcoin-rpc-url=${bitcoinRpcUrl}`);
        }
        __classPrivateFieldSet(this, _TestMainchain_process, (0, node_child_process_1.spawn)(__classPrivateFieldGet(this, _TestMainchain_binPath, "f"), execArgs, {
            stdio: ['ignore', 'pipe', 'pipe', 'ignore'],
            env: { ...process.env, RUST_LOG: `${this.loglevel},sc_rpc_server=info` },
        }), "f");
        __classPrivateFieldGet(this, _TestMainchain_process, "f").stderr.setEncoding('utf8');
        __classPrivateFieldGet(this, _TestMainchain_process, "f").stdout.setEncoding('utf8');
        __classPrivateFieldGet(this, _TestMainchain_process, "f").stdout.on('data', data => {
            console.log('Main >> %s', data);
        });
        const int1 = readline.createInterface({ input: __classPrivateFieldGet(this, _TestMainchain_process, "f").stdout }).on('line', line => {
            if (line)
                console.log('Main >> %s', line);
        });
        __classPrivateFieldGet(this, _TestMainchain_interfaces, "f").push(int1);
        this.port = await new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _TestMainchain_process, "f").on('error', err => {
                console.warn('Error running mainchain', err);
                reject(err);
            });
            const int2 = readline.createInterface({ input: __classPrivateFieldGet(this, _TestMainchain_process, "f").stderr }).on('line', line => {
                console.log('Main >> %s', line);
                const match = line.match(/Running JSON-RPC server: addr=([\d.:]+)/);
                if (match) {
                    resolve(match[1].split(':').pop());
                }
            });
            __classPrivateFieldGet(this, _TestMainchain_interfaces, "f").push(int2);
        });
        if (this.containerName) {
            this.port = await (0, testHelpers_1.getDockerPortMapping)(this.containerName, 9944);
            this.proxy = (0, testHelpers_1.cleanHostForDocker)(await (0, testHelpers_1.getProxy)());
        }
        console.log(`Ulx Node listening at ${this.address}`);
        return this.address;
    }
    async teardown() {
        if (process.env.ULX_USE_DOCKER_BINS) {
            try {
                (0, node_child_process_1.execSync)(`docker rm -f ${this.containerName}`);
            }
            catch { }
        }
        __classPrivateFieldGet(this, _TestMainchain_bitcoind, "f")?.kill();
        __classPrivateFieldGet(this, _TestMainchain_process, "f")?.kill();
        for (const i of __classPrivateFieldGet(this, _TestMainchain_interfaces, "f")) {
            i.close();
        }
    }
    async startBitcoin() {
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
        return (0, testHelpers_1.cleanHostForDocker)(`http://bitcoin:bitcoin@localhost:${14388}`);
    }
}
_TestMainchain_binPath = new WeakMap(), _TestMainchain_bitcoind = new WeakMap(), _TestMainchain_process = new WeakMap(), _TestMainchain_interfaces = new WeakMap();
exports.default = TestMainchain;
//# sourceMappingURL=TestMainchain.js.map