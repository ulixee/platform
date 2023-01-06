import Databox from '@ulixee/databox';
import Function from '@ulixee/databox/lib/Function';
import { IFetchMetaResponseData, IMessage, IResponse } from '../interfaces/ILocalDataboxProcess';

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
    let databox = requireDatabox(message.scriptPath);
    // wrap function in a default databox
    if (databox instanceof Function) {
      const functionName = databox.name ?? 'default';
      databox = new Databox({
        functions: { [functionName]: databox },
        remoteDataboxes: {},
      }) as Databox;
    }

    const metadata = databox.metadata;

    const tableSeedlingsByName: IFetchMetaResponseData['tableSeedlingsByName'] = {};
    for (const [name, table] of Object.entries(databox.tables ?? {})) {
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
    const databox = requireDatabox(message.scriptPath);

    if (!databox.metadata.functionsByName[message.functionName]) {
      return sendToParent({
        responseId: message.messageId,
        data: {
          error: { message: `Database function "${message.functionName}" not found.` },
        },
      });
    }

    try {
      const stream = databox.stream(message.functionName, message.input);
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

function requireDatabox(scriptPath: string): Databox {
  const imported = require(scriptPath); // eslint-disable-line import/no-dynamic-require
  const defaultExport = imported.default || imported;
  if (!defaultExport) throw new Error(`Databox script has no default export`);
  return defaultExport;
}
