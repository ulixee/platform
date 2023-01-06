import Datastore from '@ulixee/datastore';
import Function from '@ulixee/datastore/lib/Function';
import { IFetchMetaResponseData, IMessage, IResponse } from '../interfaces/ILocalDatastoreProcess';

function sendToParent(response: IResponse): void {
  process.send(response);
}

function exit(): void {
  process.exit();
}

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('SIGHUP', exit);
process.on('exit', exit);

process.on('message', async (message: IMessage) => {
  await new Promise(process.nextTick);
  if (message.action === 'fetchMeta') {
    let datastore = requireDatastore(message.scriptPath);
    // wrap function in a default datastore
    if (datastore instanceof Function) {
      const functionName = datastore.name ?? 'default';
      datastore = new Datastore({
        functions: { [functionName]: datastore },
        remoteDatastores: {},
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
  if (message.action === 'stream') {
    const datastore = requireDatastore(message.scriptPath);

    if (!datastore.metadata.functionsByName[message.functionName]) {
      return sendToParent({
        responseId: message.messageId,
        data: {
          error: { message: `Database function "${message.functionName}" not found.` },
        },
      });
    }

    try {
      const stream = datastore.stream(message.functionName, message.input);
      for await (const output of stream) {
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
    } catch (error) {
      sendToParent({
        responseId: message.messageId,
        data: {
          error: { ...error },
        },
      });
    }
  }

  // @ts-ignore
  throw new Error(`unknown action: ${message.action}`);
});

function requireDatastore(scriptPath: string): Datastore {
  const imported = require(scriptPath); // eslint-disable-line import/no-dynamic-require
  const defaultExport = imported.default || imported;
  if (!defaultExport) throw new Error(`Datastore script has no default export`);
  return defaultExport;
}
