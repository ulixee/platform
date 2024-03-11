import { UlixeeError } from '@ulixee/commons/lib/errors';
export declare class DatastoreNotFoundError extends Error {
    readonly data?: {
        version?: string;
        latestVersion?: string;
    };
    code: string;
    constructor(message: string, data?: {
        version?: string;
        latestVersion?: string;
    });
}
export declare class MissingRequiredSettingError extends Error {
    readonly setting: string;
    readonly defaultValue?: any;
    code: string;
    constructor(message: string, setting: string, defaultValue?: any);
}
export declare class InvalidPermissionsError extends Error {
    code: string;
    constructor(message: string);
}
export declare class InsufficientMicronoteFundsError extends UlixeeError {
    static get code(): string;
    constructor(microgonsProvided: number, microgonsNeeded: number);
}
export declare class MicronotePaymentRequiredError extends UlixeeError {
    readonly minimumMicrogonsRequired: number;
    static get code(): string;
    constructor(message: string, minimumMicrogonsRequired: number);
}
export declare class InvalidMicronoteError extends UlixeeError {
    static get code(): string;
    constructor(message: string);
}
export declare class InsufficientQueryPriceError extends UlixeeError {
    static get code(): string;
    constructor(microgonsAllocated: number, minimumMicrogonsAccepted: number);
}
export declare class MaxSurgePricePerQueryExceeededError extends UlixeeError {
    static get code(): string;
    constructor(clientMaxPricePerQuery: number, cloudPricePerQuery: number);
}
