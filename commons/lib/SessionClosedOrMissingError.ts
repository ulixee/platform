import { CanceledPromiseError } from '../interfaces/IPendingWaitEvent';
import { registerSerializableErrorType } from './TypeSerializer';

export class SessionClosedOrMissingError extends CanceledPromiseError {
  constructor(message: string) {
    super(message);
    this.name = 'SessionClosedOrMissingError';
  }
}

registerSerializableErrorType(SessionClosedOrMissingError);
