import { registerSerializableErrorType } from '@ulixee/commons/lib/TypeSerializer';
import { IVersionHistoryEntry } from '@ulixee/databox-interfaces/IDataboxManifest';

export default class MissingLinkedScriptVersionsError extends Error {
  public code = 'MissingLinkedScriptVersionsError';
  constructor(message: string, readonly previousVersions?: IVersionHistoryEntry[]) {
    super(message);
    this.name = 'MissingLinkedScriptVersionsError';
  }
}

registerSerializableErrorType(MissingLinkedScriptVersionsError);
