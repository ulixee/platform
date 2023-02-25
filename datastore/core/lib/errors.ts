// eslint-disable-next-line max-classes-per-file
import { registerSerializableErrorType } from '@ulixee/commons/lib/TypeSerializer';
import { IVersionHistoryEntry } from '@ulixee/platform-specification/types/IDatastoreManifest';
import { UlixeeError } from '@ulixee/commons/lib/errors';

export class DatastoreNotFoundError extends Error {
  public code = 'ERR_DATASTORE_NOT_FOUND';
  constructor(message: string, readonly latestVersionHash?: string) {
    super(message);
    this.name = 'DatastoreNotFoundError';
  }
}

export class InvalidScriptVersionHistoryError extends Error {
  public code = 'ERR_INVALID_SCRIPT_VERSION_HISTORY';
  constructor(message: string, readonly versionHistory?: IVersionHistoryEntry[]) {
    super(message);
    this.name = 'InvalidScriptVersionHistoryError';
  }
}

export class InvalidPermissionsError extends Error {
  public code = 'ERR_INVALID_PERMISSIONS';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPermissionsError';
  }
}

export class MissingLinkedScriptVersionsError extends Error {
  public code = 'ERR_MISSING_VERSIONS';
  constructor(message: string, readonly previousVersions?: IVersionHistoryEntry[]) {
    super(message);
    this.name = 'MissingLinkedScriptVersionsError';
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

  constructor(clientMaxPricePerQuery: number, minerPricePerQuery: number) {
    super(
      'The maximum surge price per query requested was not accepted by this Miner.',
      MaxSurgePricePerQueryExceeededError.code,
    );
    this.data = {
      clientMaxPricePerQuery,
      minerPricePerQuery,
    };
  }
}

registerSerializableErrorType(MissingLinkedScriptVersionsError);
registerSerializableErrorType(InvalidScriptVersionHistoryError);
registerSerializableErrorType(DatastoreNotFoundError);
registerSerializableErrorType(MaxSurgePricePerQueryExceeededError);
registerSerializableErrorType(InsufficientQueryPriceError);
