import Datastore from '@ulixee/datastore';
import Function from '@ulixee/datastore/lib/Function';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { IFetchMetaResponseData, IMessage, IResponse } from '../interfaces/ILocalDatastoreProcess';
import { DatastoreNotFoundError } from '../lib/errors';

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
      if (datastore instanceof Function) {
        const functionName = datastore.name ?? 'default';
        datastore = new Datastore({
          functions: { [functionName]: datastore },
          tables: {},
        }) as Datastore;
      }

      const metadata = datastore.metadata;

      const tableSeedlingsByName: IFetchMetaResponseData['tableSeedlingsByName'] = {};
      for (const [name, table] of Object.entries(datastore.tables ?? {})) {
        tableSeedlingsByName[name] = table.seedlings;
      }

      return sendToParent({
        responseId: message.messageId,
        data: {
          ...metadata,
          tableSeedlingsByName,
        },
      });
    }
    if (message.action === 'run') {
      const datastore = requireDatastore(message.scriptPath);

      if (!datastore.functions[message.functionName]) {
        return sendToParent({
          responseId: message.messageId,
          data: new DatastoreNotFoundError(
            `Database function "${message.functionName}" not found.`,
          ),
        });
      }

      const iterator = datastore.functions[message.functionName].runInternal(message.functionName, message.input);
      for await (const output of iterator) {
        sendToParent({
          responseId: null,
          streamId: message.streamId,
          data: output,
        });
      }

      return sendToParent({
        responseId: message.messageId,
        data: {},
      });
    }
    // @ts-ignore
    throw new Error(`unknown action: ${message.action}`);
  } catch (error) {
    sendToParent({
      responseId: message.messageId,
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
