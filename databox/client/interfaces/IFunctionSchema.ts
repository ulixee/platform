import {
  ExtractSchemaType,
  ISchemaAny,
  ObjectSchema,
  ArraySchema,
  DateUtilities,
} from '@ulixee/schema';

export { ExtractSchemaType };

type IOutputType = Record<string, ISchemaAny> | ObjectSchema<any> | ArraySchema<any>;

export default interface IFunctionSchema<
  Input extends Record<string, ISchemaAny> = Record<string, ISchemaAny>,
  Output extends IOutputType = IOutputType,
> {
  input?: Input;
  output?: Output;
  inputExamples?: IInputSchemaType<this['input']>[];
}

export const FunctionSchema = <Input extends Record<string, ISchemaAny>, Output extends IOutputType>(
  schema: IFunctionSchema<Input, Output>,
): IFunctionSchema<Input, Output> => schema;

type IInputSchemaType<T extends Record<string, ISchemaAny>> = {
  [P in keyof T]?: T[P]['$type'] | DateUtilities;
};
