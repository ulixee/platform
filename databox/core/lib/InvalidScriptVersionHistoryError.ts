import { registerSerializableErrorType } from '@ulixee/commons/lib/TypeSerializer';
import { IVersionHistoryEntry } from '@ulixee/databox-interfaces/IDataboxManifest';

export default class InvalidScriptVersionHistoryError extends Error {
  public code = 'InvalidScriptVersionHistoryError';
  constructor(message: string, readonly versionHistory?: IVersionHistoryEntry[]) {
    super(message);
    this.name = 'InvalidScriptVersionHistoryError';
  }
}

registerSerializableErrorType(InvalidScriptVersionHistoryError);
