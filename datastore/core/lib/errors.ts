// eslint-disable-next-line max-classes-per-file
import { UlixeeError } from '@ulixee/commons/lib/errors';
import { registerSerializableErrorType } from '@ulixee/commons/lib/TypeSerializer';

export class DatastoreNotFoundError extends Error {
  public code = 'ERR_DATASTORE_NOT_FOUND';
  constructor(message: string, readonly data?: { version?: string; latestVersion?: string }) {
    super(message);
    this.name = 'DatastoreNotFoundError';
  }
}

export class MissingRequiredSettingError extends Error {
  public code = 'ERR_MISSING_SETTING';
  constructor(message: string, readonly setting: string, readonly defaultValue?: any) {
    super(message);
    this.name = 'MissingRequiredSettingError';
  }
}

export class InvalidPermissionsError extends Error {
  public code = 'ERR_INVALID_PERMISSIONS';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPermissionsError';
  }
}

export class InsufficientMicronoteFundsError extends UlixeeError {
  static get code(): string {
    return 'ERR_NSF_MICRONOTE';
  }

  constructor(microgonsProvided: number, microgonsNeeded: number) {
    super('The micronote will not cover this data query', InsufficientMicronoteFundsError.code);
    this.data = { microgonsProvided, microgonsNeeded };
  }
}

export class MicronotePaymentRequiredError extends UlixeeError {
  static get code(): string {
    return 'ERR_NEEDS_PAYMENT';
  }

  constructor(message: string, readonly minimumMicrogonsRequired: number) {
    super(message, MicronotePaymentRequiredError.code);
  }
}

export class InvalidMicronoteError extends UlixeeError {
  static get code(): string {
    return 'ERR_MICRONOTE_INVALID';
  }

  constructor(message: string) {
    super(message, InvalidMicronoteError.code);
  }
}

export class InsufficientQueryPriceError extends UlixeeError {
  static get code(): string {
    return 'ERR_PRICE_TOO_LOW';
  }

  constructor(microgonsAllocated: number, minimumMicrogonsAccepted: number) {
    super(
      'This Micronote has insufficient funding allocated for this Data query.',
      InsufficientQueryPriceError.code,
    );
    this.data = {
      microgonsAllocated,
      minimumMicrogonsAccepted,
    };
  }
}

export class MaxSurgePricePerQueryExceeededError extends UlixeeError {
  static get code(): string {
    return 'ERR_MAX_PRICE_EXCEEDED';
  }

  constructor(clientMaxPricePerQuery: number, cloudPricePerQuery: number) {
    super(
      'The maximum surge price per query requested was not accepted by this Cloud.',
      MaxSurgePricePerQueryExceeededError.code,
    );
    this.data = {
      clientMaxPricePerQuery,
      cloudPricePerQuery,
    };
  }
}

registerSerializableErrorType(DatastoreNotFoundError);
registerSerializableErrorType(MaxSurgePricePerQueryExceeededError);
registerSerializableErrorType(InsufficientQueryPriceError);
