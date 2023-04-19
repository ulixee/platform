import Datastore from '@ulixee/datastore';
import Extractor from '@ulixee/datastore/lib/Extractor';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { IFetchMetaResponseData, IMessage, IResponse } from '../interfaces/ILocalDatastoreProcess';

function sendToParent(response: IResponse): void {
  process.send(TypeSerializer.stringify(response));
}

function exit(): void {
  process.exit();
}

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('SIGHUP', exit);
process.on('exit', exit);

process.on('message', async (messageJson: string) => {
  const message = TypeSerializer.parse(messageJson) as IMessage;
  await new Promise(process.nextTick);
  try {
    if (message.action === 'fetchMeta') {
      let datastore = requireDatastore(message.scriptPath);
      // wrap function in a default datastore
      if (datastore instanceof Extractor) {
        const extractorName = datastore.name ?? 'default';
        datastore = new Datastore({
          extractors: { [extractorName]: datastore },
          tables: {},
        }) as Datastore;
      }

      const metadata = datastore.metadata;

      const tableSeedlingsByName: IFetchMetaResponseData['tableSeedlingsByName'] = {};
      for (const [name, table] of Object.entries(datastore.tables ?? {})) {
        tableSeedlingsByName[name] = table.seedlings;
      }

      return sendToParent({
        data: {
          ...metadata,
          tableSeedlingsByName,
        },
      });
    }
    // @ts-ignore
    throw new Error(`unknown action: ${message.action}`);
  } catch (error) {
    sendToParent({
      data: error,
    });
  }
});

function requireDatastore(scriptPath: string): Datastore {
  const imported = require(scriptPath); // eslint-disable-line import/no-dynamic-require
  const defaultExport = imported.default || imported;
  if (!defaultExport) throw new Error(`Datastore script has no default export`);
  return defaultExport;
}
