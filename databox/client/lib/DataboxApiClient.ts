import { ConnectionToCore, WsTransportToCore } from '@ulixee/net';
import DataboxApiSchemas, { IDataboxApis, IDataboxApiTypes } from '@ulixee/specification/databox';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import ValidationError from '@ulixee/specification/utils/ValidationError';
import { IPayment } from '@ulixee/specification';

export default class DataboxApiClient {
  public connectionToCore: ConnectionToCore<IDataboxApis, {}>;
  public validateApiParameters = true;

  constructor(host: string) {
    const transport = new WsTransportToCore(`${host}/databox`);
    this.connectionToCore = new ConnectionToCore(transport);
  }

  public async getMeta(versionHash: string): Promise<IDataboxApiTypes['Databox.meta']['result']> {
    return await this.runRemote('Databox.meta', { versionHash });
  }

  public async run(
    versionHash: string,
    input: any,
    payment?: IPayment,
  ): Promise<IDataboxApiTypes['Databox.run']['result']> {
    return await this.runRemote('Databox.run', { versionHash, payment, input });
  }

  public async upload(
    compressedDatabox: Buffer,
    options: { allowNewLinkedVersionHistory?: boolean; timeoutMs?: number; identity?: Identity } = {},
  ): Promise<{ success: boolean }> {
    options.allowNewLinkedVersionHistory ??= false;
    options.timeoutMs ??= 120e3;
    const { allowNewLinkedVersionHistory, timeoutMs } = options;

    let uploaderSignature: Buffer;
    let uploaderIdentity: string;
    if (options.identity) {
      const identity = options.identity;
      uploaderIdentity = identity.bech32;
      const message = sha3(
        concatAsBuffer('Databox.upload', compressedDatabox, String(allowNewLinkedVersionHistory)),
      );
      uploaderSignature = identity.sign(message);
    }

    return await this.runRemote(
      'Databox.upload',
      {
        compressedDatabox,
        allowNewLinkedVersionHistory,
        uploaderSignature,
        uploaderIdentity,
      },
      timeoutMs,
    );
  }

  protected async runRemote<T extends keyof IDataboxApiTypes & string>(
    command: T,
    args: IDataboxApiTypes[T]['args'],
    timeoutMs?: number,
  ): Promise<IDataboxApiTypes[T]['result']> {
    try {
      if (this.validateApiParameters) {
        args = await DataboxApiSchemas[command].args.parseAsync(args);
      }
    } catch (error) {
      throw ValidationError.fromZodValidation(
        `The API parameters for ${command} have some issues`,
        error,
      );
    }

    return await this.connectionToCore.sendRequest({ command, args: [args] as any }, timeoutMs);
  }
}
