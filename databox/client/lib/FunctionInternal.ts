import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import BaseSchema from '@ulixee/schema/lib/BaseSchema';
import { DateUtilities, ObjectSchema } from '@ulixee/schema';
import { IValidationError } from '@ulixee/schema/interfaces/IValidationResult';
import { pickRandom } from '@ulixee/commons/lib/utils';
import StringSchema from '@ulixee/schema/lib/StringSchema';
import DataboxSchemaError from './DataboxSchemaError';
import IFunctionSchema, { ExtractSchemaType } from '../interfaces/IFunctionSchema';
import IFunctionExecOptions from '../interfaces/IFunctionExecOptions';
import FunctionContext from './FunctionContext';
import Output, { createObservableOutput } from './Output';
import IObservableChange from '../interfaces/IObservableChange';

export default class FunctionInternal<
  ISchema extends IFunctionSchema,
  TOptions extends IFunctionExecOptions<ISchema> = IFunctionExecOptions<ISchema>,
  TInput = ExtractSchemaType<ISchema['input']>,
  TOutput = ExtractSchemaType<ISchema['output']>,
> extends TypedEventEmitter<{
  close: void;
}> {
  #isClosing: Promise<void>;

  readonly options: TOptions;
  readonly schema: ISchema;

  public onOutputChanges: (changes: IObservableChange[]) => any;
  protected readonly _input: TInput;
  protected _output: Output<TOutput>;
  protected readonly outputSchema: BaseSchema<any>;

  constructor(options: TOptions, components: { schema?: ISchema }) {
    super();
    this.options = options;
    this.schema = components.schema;
    this._input = (options.input ?? {}) as TInput;

    if (components.schema?.inputExamples?.length && components.schema.input) {
      const randomEntry = pickRandom(components.schema.inputExamples);
      for (const [key, schema] of Object.entries(components.schema.input)) {
        if (this._input[key] === undefined) {
          let value = randomEntry[key];
          if (
            value instanceof DateUtilities &&
            schema instanceof StringSchema &&
            (schema.format === 'date' || schema.format === 'time')
          ) {
            value = value.evaluate(schema.format);
          }
          this._input[key] = value;
        }
      }
    }

    if (this.schema?.output) {
      let outputSchema = this.schema.output as unknown as BaseSchema<any>;
      if (!(outputSchema instanceof BaseSchema)) {
        outputSchema = new ObjectSchema({ fields: outputSchema as any });
      }
      this.outputSchema = outputSchema;
    }
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get input(): TInput {
    if (this._input && typeof this._input === 'object') {
      return { ...this._input };
    }
    return this._input;
  }

  public get output(): TOutput {
    this._output ??= createObservableOutput(this.defaultOnOutputChanges.bind(this)) as any;
    return this._output as any;
  }

  public set output(value: TOutput) {
    const output = this.output;
    for (const key of Object.keys(output)) {
      delete output[key];
    }
    Object.assign(output, value);
  }

  public async execRunner(
    context: FunctionContext<ISchema>,
    runFn: (context: FunctionContext<ISchema>) => void | Promise<void>,
  ): Promise<void> {
    try {
      await runFn(context);
    } catch (error) {
      if (error.stack.includes('at async FunctionInternal.execRunner')) {
        error.stack = error.stack.split('at async FunctionInternal.execRunner').shift().trim();
      }
      throw error;
    }
  }

  public close(closeFn?: () => Promise<void>): Promise<void> {
    if (this.#isClosing) return this.#isClosing;
    this.emit('close');
    this.#isClosing = new Promise(async (resolve, reject) => {
      try {
        if (closeFn) await closeFn();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    return this.#isClosing;
  }

  public validateInput(): DataboxSchemaError {
    if (!this.schema?.input) return;
    const schema = new ObjectSchema({ fields: this.schema.input });
    const inputValidation = schema.validate(this.input);
    if (!inputValidation.success) {
      throw new DataboxSchemaError(
        'The Function input did not match its Schema',
        inputValidation.errors,
      );
    }
  }

  public validateOutput(): void {
    if (!this.outputSchema) return;
    const outputValidation = this.outputSchema.validate(this.output);
    if (!outputValidation.success) {
      throw new DataboxSchemaError(
        'The Function output did not match its Schema',
        outputValidation.errors,
      );
    }
  }

  protected defaultOnOutputChanges(changes: IObservableChange[]): void {
    if (this.onOutputChanges) this.onOutputChanges(changes);
    try {
      this.validateOutput();
    } catch (err) {
      // NOTE: filter errors to only changed schema elements. Otherwise, we get incomplete object errors
      if (err instanceof DataboxSchemaError) {
        const validErrors: IValidationError[] = [];
        for (const change of changes) {
          const path = `.${change.path.join('.')}`;
          let keyPaths: string[] = [];
          if (change.type === 'insert' && typeof change.value === 'object') {
            keyPaths = Object.keys(change.value).map(x => `${path}.${x}`);
          }
          for (const error of err.errors) {
            if (error.path === path || keyPaths.some(x => error.path.startsWith(x)))
              validErrors.push(error);
          }
        }
        if (validErrors.length) throw new DataboxSchemaError(err.message, validErrors);
      }
    }
  }
}
