import { registerSerializableErrorType } from '@ulixee/commons/lib/TypeSerializer';

export default class DataboxNotFoundError extends Error {
  public code = 'DataboxNotFoundError';
  constructor(message: string, readonly latestVersionHash?: string) {
    super(message);
    this.name = 'DataboxNotFoundError';
  }
}

registerSerializableErrorType(DataboxNotFoundError);
