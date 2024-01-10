/// <reference types="node" />
declare type IDbTypes = {
    string: string;
    number: number;
    boolean: boolean;
    bigint: bigint;
    object: object;
    array: [];
    buffer: Buffer;
    date: Date;
    record: Record<string, IDbTypes>;
};
export declare type IDbTypeNames = keyof IDbTypes;
export declare type IDbJsTypes = IDbTypes[IDbTypeNames];
export default IDbTypes;
