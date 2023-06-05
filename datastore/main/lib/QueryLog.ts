import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import * as Fs from 'fs';
import * as Readline from 'readline';
import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import * as Path from 'path';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IQueryLogEntry from '../interfaces/IQueryLogEntry';

export default class QueryLog {
  public queriesById: { [id: string]: IQueryLogEntry } = {};
  public queryLogPath = Path.join(getDataDirectory(), 'ulixee', 'user-querylog.jsonl');

  private fileWatcher: Fs.FSWatcher;
  private queryLogBytesRead = 0;
  private appendOps = new Set<Promise<any>>();
  private events = new TypedEventEmitter<{
    new: IQueryLogEntry;
  }>();

  constructor() {
    if (!Fs.existsSync(Path.dirname(this.queryLogPath)))
      Fs.mkdirSync(Path.dirname(this.queryLogPath));
    if (!Fs.existsSync(this.queryLogPath)) Fs.writeFileSync(this.queryLogPath, '');
    this.watchFileCallback = this.watchFileCallback.bind(this);
  }

  public monitor(onNewQuery: (query: IQueryLogEntry) => any): { stop: () => void } {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      this.fileWatcher = Fs.watch(this.queryLogPath, { persistent: false }, () => {
        void this.publishQueries();
      });
    } else {
      Fs.watchFile(this.queryLogPath, { persistent: false }, this.watchFileCallback);
    }
    this.events.on('new', onNewQuery);
    void this.publishQueries();
    return {
      stop() {
        this.events.off('new', onNewQuery);
        if (!this.events.listenerCount('new')) {
          this.stopWatching();
        }
      },
    };
  }

  public async close(): Promise<void> {
    await Promise.all(this.appendOps);
    this.stopWatching();
  }

  public log(
    query:
      | IDatastoreApiTypes['Datastore.query']['args']
      | IDatastoreApiTypes['Datastore.stream']['args'],
    startDate: Date,
    outputs: any[],
    metadata: IDatastoreApiTypes['Datastore.query']['result']['metadata'],
    cloudNodeHost: string,
    cloudNodeIdentity?: string,
    error?: Error,
  ): void {
    const { id, versionHash, affiliateId, payment } = query;
    const streamQuery = query as IDatastoreApiTypes['Datastore.stream']['args'];

    const input = 'boundValues' in query ? query.boundValues : streamQuery.input;

    try {
      const record = <IQueryLogEntry>{
        id,
        versionHash,
        date: startDate,
        affiliateId,
        creditId: payment?.credits?.id,
        micronoteId: payment?.micronote?.micronoteId,
        input,
        query: 'sql' in query ? query.sql : `stream(${streamQuery.name})`,
        outputs,
        error,
        cloudNodeHost,
        cloudNodeIdentity,
        ...(metadata ?? {}),
      };
      const op = Fs.promises
        .appendFile(this.queryLogPath, `${TypeSerializer.stringify(record)}\n`)
        .catch(() => null);
      this.appendOps.add(op);
      void op.finally(() => this.appendOps.delete(op));
    } catch {}
  }

  private stopWatching(): void {
    if (this.fileWatcher) this.fileWatcher?.close();
    else Fs.unwatchFile(this.queryLogPath, this.watchFileCallback);
  }

  private watchFileCallback(curr: Fs.Stats, prev: Fs.Stats): void {
    if (curr.mtimeMs > prev.mtimeMs) {
      void this.publishQueries();
    }
  }

  private async publishQueries(): Promise<void> {
    try {
      const readable = Fs.createReadStream(this.queryLogPath, { start: this.queryLogBytesRead });
      const reader = Readline.createInterface({ input: readable });
      for await (const line of reader) {
        const record = TypeSerializer.parse(line);
        if (this.queriesById[record.id]) continue;

        this.queriesById[record.id] = record;
        this.events.emit('new', record);
      }
      this.queryLogBytesRead += readable.bytesRead;
      readable.close();
    } catch (err) {
      console.error(err);
    }
  }
}
