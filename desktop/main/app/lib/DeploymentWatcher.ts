import * as Fs from 'fs';
import * as Path from 'path';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import UlixeeConfig from '@ulixee/commons/config';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';

const deploymentsFile = Path.join(UlixeeConfig.global.directoryPath, 'datastore-deployments.jsonl');

export default class DeploymentWatcher extends TypedEventEmitter<{
  new: IDatastoreDeployLogEntry;
}> {
  public deployments: IDatastoreDeployLogEntry[] = [];

  private deploymentFileWatch: Fs.FSWatcher;

  constructor() {
    super();
    void this.checkFile();
  }

  public start(): void {
    if (!Fs.existsSync(deploymentsFile)) Fs.writeFileSync(deploymentsFile, '');
    if (process.platform === 'win32' || process.platform === 'darwin') {
      this.deploymentFileWatch = Fs.watch(deploymentsFile, { persistent: false }, () => {
        void this.checkFile();
      });
    } else {
      Fs.watchFile(deploymentsFile, { persistent: false }, (curr, prev) => {
        if (curr.mtimeMs > prev.mtimeMs) {
          void this.checkFile();
        }
      });
    }
  }

  public stop(): void {
    if (this.deploymentFileWatch) this.deploymentFileWatch?.close();
    else Fs.unwatchFile(deploymentsFile);
  }

  private async checkFile(): Promise<void> {
    try {
      const data = await Fs.promises.readFile(deploymentsFile, 'utf8');
      const allRecords: IDatastoreDeployLogEntry[] = data
        .split(/\r?\n/g)
        .filter(Boolean)
        .map(x => JSON.parse(x));
      for (const record of allRecords) {
        if (
          this.deployments.some(
            x => x.cloudHost === record.cloudHost && x.version === record.version,
          )
        ) {
          continue;
        }
        this.deployments.push(record);
        this.emit('new', record);
      }
    } catch {}
  }
}
