import { DateUtilities, ExtractSchemaType, ISchemaAny } from '@ulixee/schema';

export { ExtractSchemaType };

export type ISchemaRecordType<T> = T extends Record<string, ISchemaAny>
  ? {
      [K in keyof T]: T[K];
    }
  : never;

export default interface IRunnerSchema<
  TInput extends ISchemaRecordType<any> = ISchemaRecordType<any>,
  TOutput extends ISchemaRecordType<any> = ISchemaRecordType<any>,
> {
  input?: TInput;
  output?: TOutput;
  inputExamples?: IInputSchemaType<this['input']>[];
}

export const RunnerSchema = <
  TInput extends ISchemaRecordType<any>,
  TOutput extends ISchemaRecordType<any>,
>(
  schema: IRunnerSchema<TInput, TOutput>,
): IRunnerSchema<TInput, TOutput> => schema;

type IInputSchemaType<T extends ISchemaRecordType<any>> = {
  [P in keyof T]?: T[P]['$type'] | DateUtilities;
};
