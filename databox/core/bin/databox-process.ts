import Databox from '@ulixee/databox';
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
    const databoxExecutable = loadDataboxExport(message.scriptPath);

    const functionsByName: IFetchMetaResponseData['functionsByName'] = {};
    for (const [name, func] of Object.entries(databoxExecutable.functions ?? {})) {
      functionsByName[name] = { corePlugins: func.plugins.corePlugins ?? {}, schema: func.schema };
    }

    return sendToParent({
      responseId: message.messageId,
      data: {
        coreVersion: databoxExecutable.coreVersion,
        functionsByName,
      },
    });
  }
  if (message.action === 'exec') {
    const databoxExecutable = loadDataboxExport(message.scriptPath);
    const output = await databoxExecutable.functions[message.functionName].exec(message.input);

    return sendToParent({
      responseId: message.messageId,
      data: {
        output,
      },
    });
  }

  // @ts-ignore
  throw new Error(`unknown action: ${message.action}`);
});

function loadDataboxExport(scriptPath: string): Databox<any, any> {
  const imported = require(scriptPath); // eslint-disable-line import/no-dynamic-require
  const defaultExport = imported.default || imported;
  if (!defaultExport) throw new Error(`Databox script has no default export`);
  return defaultExport;
}
