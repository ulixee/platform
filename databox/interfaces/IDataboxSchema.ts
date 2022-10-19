import {
  ExtractSchemaType,
  ISchemaAny,
  ObjectSchema,
  ArraySchema,
  DateUtilities,
} from '@ulixee/schema';

export { ExtractSchemaType };

type IOutputType = Record<string, ISchemaAny> | ObjectSchema<any> | ArraySchema<any>;

export default interface IDataboxSchema<
  Input extends Record<string, ISchemaAny> = Record<string, ISchemaAny>,
  Output extends IOutputType = IOutputType,
> {
  name?: string;
  description?: string;
  icon?: string;
  input?: Input;
  output?: Output;
  inputExamples?: IInputSchemaType<this['input']>[];
}

export const Schema = <Input extends Record<string, ISchemaAny>, Output extends IOutputType>(
  schema: IDataboxSchema<Input, Output>,
): IDataboxSchema<Input, Output> => schema;

type IInputSchemaType<T extends Record<string, ISchemaAny>> = {
  [P in keyof T]?: T[P]['type'] | DateUtilities;
};
