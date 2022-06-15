import { IDataboxWrapperClass } from "@ulixee/databox-interfaces/IDataboxWrapper";
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
  if (message.action === 'fetchModule') {
    const imported = require(message.scriptPath);
    if (!imported.default)  throw new Error(`Databox script has no default export`);
    
    const DataboxWrapper = imported.default.constructor as IDataboxWrapperClass;
    return sendToParent({
      responseId: message.messageId,
      data: {
        module: DataboxWrapper.module,
      },
    });

  } else if (message.action === 'run') {
    const imported = require(message.scriptPath);
    if (!imported.default) throw new Error(`Databox script has no default export`);

    const output = await imported.default.run(message.input);

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
