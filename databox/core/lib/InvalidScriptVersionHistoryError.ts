import { registerSerializableErrorType } from '@ulixee/commons/lib/TypeSerializer';
import { IVersionHashToCreatedTimestamp } from './DataboxVersionsTable';

export default class InvalidScriptVersionHistoryError extends Error {
  public code = 'InvalidScriptVersionHistoryError';
  constructor(message: string, readonly versionHashHistory?: IVersionHashToCreatedTimestamp) {
    super(message);
    this.name = 'InvalidScriptVersionHistoryError';
  }
}

registerSerializableErrorType(InvalidScriptVersionHistoryError);
