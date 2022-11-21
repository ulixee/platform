import { IValidationError } from '@ulixee/schema/interfaces/IValidationResult';

export default class DataboxSchemaError extends Error {
  constructor(message: string, readonly errors: IValidationError[]) {
    super(message);
    this.name = 'DataboxSchemaError';
    this.stack = message;
  }
}
