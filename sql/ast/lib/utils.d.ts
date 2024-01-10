import INil from "../interfaces/INil";
export declare type Optional<T> = {
    [key in keyof T]?: T[key];
};
declare type Impossible<K extends keyof any> = {
    [P in K]: never;
};
export declare type NoExtraProperties<T, U extends T = T> = U & Impossible<Exclude<keyof U, keyof T>>;
export declare type ReplaceReturnType<T, TNewReturn> = T extends (...a: any) => any ? (...a: Parameters<T>) => TNewReturn : never;
export declare class NotSupported extends Error {
    constructor(what?: string);
    static never(value: never, msg?: string): NotSupported;
}
/**
 * An helper function that returns a map of an array, but:
 * - It will return the original array if it is null-ish
 * - It will remove all null-ish entries
 * - It will return the original array if nothing has changed
 */
export declare function arrayNilMap<T extends Object>(this: void, collection: T[] | INil, mapper: (v: T) => T | INil): T[] | INil;
declare type PartialNil<T> = {
    [P in keyof T]?: T[P] | INil;
};
/**
 * An helper function that returns a copy of an object with modified properties
 * (similar to Object.assign()), but ONLY if thos properties have changed.
 * Will return the original object if not.
 */
export declare function assignChanged<T>(orig: T, assign: PartialNil<T>): T;
export declare function trimNullish<T>(value: T, depth?: number): T;
export {};
