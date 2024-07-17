"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Fs = require("fs");
const Path = require("path");
const config_1 = require("@ulixee/commons/config");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const deploymentsFile = Path.join(config_1.default.global.directoryPath, 'datastore-deployments.jsonl');
class DeploymentWatcher extends eventUtils_1.TypedEventEmitter {
    constructor() {
        super();
        this.deployments = [];
        void this.checkFile();
    }
    start() {
        if (!Fs.existsSync(deploymentsFile))
            Fs.writeFileSync(deploymentsFile, '');
        if (process.platform === 'win32' || process.platform === 'darwin') {
            this.deploymentFileWatch = Fs.watch(deploymentsFile, { persistent: false }, () => {
                void this.checkFile();
            });
        }
        else {
            Fs.watchFile(deploymentsFile, { persistent: false }, (curr, prev) => {
                if (curr.mtimeMs > prev.mtimeMs) {
                    void this.checkFile();
                }
            });
        }
    }
    stop() {
        if (this.deploymentFileWatch)
            this.deploymentFileWatch?.close();
        else
            Fs.unwatchFile(deploymentsFile);
    }
    async checkFile() {
        try {
            const data = await Fs.promises.readFile(deploymentsFile, 'utf8');
            const allRecords = data
                .split(/\r?\n/g)
                .filter(Boolean)
                .map(x => JSON.parse(x));
            for (const record of allRecords) {
                if (this.deployments.some(x => x.cloudHost === record.cloudHost && x.version === record.version)) {
                    continue;
                }
                this.deployments.push(record);
                this.emit('new', record);
            }
        }
        catch { }
    }
}
exports.default = DeploymentWatcher;
//# sourceMappingURL=DeploymentWatcher.js.map