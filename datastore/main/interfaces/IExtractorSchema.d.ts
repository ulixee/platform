import { DateUtilities, ExtractSchemaType, ISchemaAny } from '@ulixee/schema';
export { ExtractSchemaType };
export declare type ISchemaRecordType<T> = T extends Record<string, ISchemaAny> ? {
    [K in keyof T]: T[K];
} : never;
export default interface IExtractorSchema<TInput extends ISchemaRecordType<any> = ISchemaRecordType<any>, TOutput extends ISchemaRecordType<any> = ISchemaRecordType<any>> {
    input?: TInput;
    output?: TOutput;
    inputExamples?: IInputSchemaType<this['input']>[];
}
export declare const ExtractorSchema: <TInput extends {
    [x: string]: any;
}, TOutput extends {
    [x: string]: any;
}>(schema: IExtractorSchema<TInput, TOutput>) => IExtractorSchema<TInput, TOutput>;
declare type IInputSchemaType<T extends ISchemaRecordType<any>> = {
    [P in keyof T]?: T[P]['$type'] | DateUtilities;
};
