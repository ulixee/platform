"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaxSurgePricePerQueryExceeededError = exports.InsufficientQueryPriceError = exports.InvalidMicronoteError = exports.MicronotePaymentRequiredError = exports.InsufficientMicronoteFundsError = exports.InvalidPermissionsError = exports.MissingRequiredSettingError = exports.DatastoreNotFoundError = void 0;
// eslint-disable-next-line max-classes-per-file
const errors_1 = require("@ulixee/commons/lib/errors");
const TypeSerializer_1 = require("@ulixee/commons/lib/TypeSerializer");
class DatastoreNotFoundError extends Error {
    constructor(message, data) {
        super(message);
        this.data = data;
        this.code = 'ERR_DATASTORE_NOT_FOUND';
        this.name = 'DatastoreNotFoundError';
    }
}
exports.DatastoreNotFoundError = DatastoreNotFoundError;
class MissingRequiredSettingError extends Error {
    constructor(message, setting, defaultValue) {
        super(message);
        this.setting = setting;
        this.defaultValue = defaultValue;
        this.code = 'ERR_MISSING_SETTING';
        this.name = 'MissingRequiredSettingError';
    }
}
exports.MissingRequiredSettingError = MissingRequiredSettingError;
class InvalidPermissionsError extends Error {
    constructor(message) {
        super(message);
        this.code = 'ERR_INVALID_PERMISSIONS';
        this.name = 'InvalidPermissionsError';
    }
}
exports.InvalidPermissionsError = InvalidPermissionsError;
class InsufficientMicronoteFundsError extends errors_1.UlixeeError {
    static get code() {
        return 'ERR_NSF_MICRONOTE';
    }
    constructor(microgonsProvided, microgonsNeeded) {
        super('The micronote will not cover this data query', InsufficientMicronoteFundsError.code);
        this.data = { microgonsProvided, microgonsNeeded };
    }
}
exports.InsufficientMicronoteFundsError = InsufficientMicronoteFundsError;
class MicronotePaymentRequiredError extends errors_1.UlixeeError {
    constructor(message, minimumMicrogonsRequired) {
        super(message, MicronotePaymentRequiredError.code);
        this.minimumMicrogonsRequired = minimumMicrogonsRequired;
    }
    static get code() {
        return 'ERR_NEEDS_PAYMENT';
    }
}
exports.MicronotePaymentRequiredError = MicronotePaymentRequiredError;
class InvalidMicronoteError extends errors_1.UlixeeError {
    static get code() {
        return 'ERR_MICRONOTE_INVALID';
    }
    constructor(message) {
        super(message, InvalidMicronoteError.code);
    }
}
exports.InvalidMicronoteError = InvalidMicronoteError;
class InsufficientQueryPriceError extends errors_1.UlixeeError {
    static get code() {
        return 'ERR_PRICE_TOO_LOW';
    }
    constructor(microgonsAllocated, minimumMicrogonsAccepted) {
        super('This Micronote has insufficient funding allocated for this Data query.', InsufficientQueryPriceError.code);
        this.data = {
            microgonsAllocated,
            minimumMicrogonsAccepted,
        };
    }
}
exports.InsufficientQueryPriceError = InsufficientQueryPriceError;
class MaxSurgePricePerQueryExceeededError extends errors_1.UlixeeError {
    static get code() {
        return 'ERR_MAX_PRICE_EXCEEDED';
    }
    constructor(clientMaxPricePerQuery, cloudPricePerQuery) {
        super('The maximum surge price per query requested was not accepted by this Cloud.', MaxSurgePricePerQueryExceeededError.code);
        this.data = {
            clientMaxPricePerQuery,
            cloudPricePerQuery,
        };
    }
}
exports.MaxSurgePricePerQueryExceeededError = MaxSurgePricePerQueryExceeededError;
(0, TypeSerializer_1.registerSerializableErrorType)(DatastoreNotFoundError);
(0, TypeSerializer_1.registerSerializableErrorType)(MaxSurgePricePerQueryExceeededError);
(0, TypeSerializer_1.registerSerializableErrorType)(InsufficientQueryPriceError);
//# sourceMappingURL=errors.js.map