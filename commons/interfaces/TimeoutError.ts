import { registerSerializableErrorType } from '../lib/TypeSerializer';

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? 'Timeout waiting for promise');
    this.name = 'TimeoutError';
  }
}

registerSerializableErrorType(TimeoutError);
