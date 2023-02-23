import { IValidationError } from '@ulixee/schema/interfaces/IValidationResult';

export default class DatastoreSchemaError extends Error {
  constructor(message: string, readonly errors: IValidationError[], readonly providedValue: any) {
    super(message);
    this.name = 'DatastoreSchemaError';
    this.stack = message;
  }
}
