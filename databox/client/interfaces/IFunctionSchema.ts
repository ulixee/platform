import { DateUtilities, ExtractSchemaType, ISchemaAny, ObjectSchema } from '@ulixee/schema';

export { ExtractSchemaType };

type IOutputType = Record<string, ISchemaAny> | ObjectSchema<any>;

export default interface IFunctionSchema<
  TInput extends Record<string, ISchemaAny> = Record<string, ISchemaAny>,
  TOutput extends IOutputType = IOutputType,
> {
  input?: TInput;
  output?: TOutput;
  inputExamples?: IInputSchemaType<this['input']>[];
}

export const FunctionSchema = <TInput extends Record<string, ISchemaAny>, TOutput extends IOutputType>(
  schema: IFunctionSchema<TInput, TOutput>,
): IFunctionSchema<TInput, TOutput> => schema;

type IInputSchemaType<T extends Record<string, ISchemaAny>> = {
  [P in keyof T]?: T[P]['$type'] | DateUtilities;
};
