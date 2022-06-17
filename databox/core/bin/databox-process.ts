import IDataboxWrapper from "@ulixee/databox-interfaces/IDataboxWrapper";
import { IMessage, IResponse } from "../interfaces/ILocalDataboxProcess";

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
  if (message.action === 'fetchRuntime') {
    const databoxWrapper = loadDataboxExport(message.scriptPath);
    
    return sendToParent({
      responseId: message.messageId,
      data: {
        name: databoxWrapper.runtimeName,
        version: databoxWrapper.runtimeVersion,
      },
    });

  } if (message.action === 'run') {
    const databoxWrapper = loadDataboxExport(message.scriptPath);
    const output = await databoxWrapper.run(message.input);

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

function loadDataboxExport(scriptPath: string): IDataboxWrapper {
  const imported = require(scriptPath); // eslint-disable-line import/no-dynamic-require
  const defaultExport = imported.default || imported;
  if (!defaultExport) throw new Error(`Databox script has no default export`);
  return defaultExport;
}