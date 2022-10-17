import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import IDataboxExecOptions from '@ulixee/databox-interfaces/IDataboxExecOptions';
import IDataboxSchema, { ExtractSchemaType } from '@ulixee/databox-interfaces/IDataboxSchema';
import BaseSchema from '@ulixee/schema/lib/BaseSchema';
import { ObjectSchema } from '@ulixee/schema';
import DataboxSchemaError from '@ulixee/databox-interfaces/DataboxSchemaError';
import { IValidationError } from '@ulixee/schema/interfaces/IValidationResult';
import { IDefaultsObj } from '../interfaces/IComponents';
import DataboxObject from './DataboxObject';
import Output, { createObservableOutput } from './Output';
import IObservableChange from '../interfaces/IObservableChange';

export default class DataboxInternal<
  ISchema extends IDataboxSchema,
  TInput = ExtractSchemaType<ISchema['input']>,
  TOutput = ExtractSchemaType<ISchema['output']>,
> extends TypedEventEmitter<{
  close: void;
}> {
  #isClosing: Promise<void>;

  readonly runOptions: IDataboxExecOptions<ISchema>;
  readonly defaults: IDefaultsObj<ISchema>;
  readonly schema: ISchema;

  public onOutputChanges: (changes: IObservableChange[]) => any;
  protected readonly _input: TInput;
  protected _output: Output<TOutput>;
  protected readonly outputSchema: BaseSchema<any>;

  constructor(
    runOptions: IDataboxExecOptions<ISchema>,
    components: { defaults?: IDefaultsObj<ISchema>; schema?: ISchema },
  ) {
    super();
    this.runOptions = runOptions;
    this.defaults = components.defaults ?? {};
    this.schema = components.schema;
    this._input = (this.defaults.input ?? {}) as TInput;
    if (runOptions.input) {
      if (typeof runOptions.input === 'object') {
        Object.assign(this._input, runOptions.input);
      } else {
        this._input = runOptions.input;
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
    if (!this._output) {
      this._output = createObservableOutput(this.defaultOnOutputChanges.bind(this)) as any;
      if (this.defaults.output && typeof this.defaults.output === 'object') {
        for (const [key, value] of Object.entries(this.defaults.output)) {
          (this._output as any)[key] = value;
        }
      }
    }
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
    databoxObject: DataboxObject<ISchema>,
    runFn: (databoxObject: DataboxObject<ISchema>) => void | Promise<void>,
  ): Promise<void> {
    try {
      await runFn(databoxObject);
    } catch (error) {
      if (error.stack.includes('at async DataboxInternal.execRunner')) {
        error.stack = error.stack.split('at async DataboxInternal.execRunner').shift().trim();
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
        'The Databox input did not match its Schema',
        inputValidation.errors,
      );
    }
  }

  public validateOutput(): void {
    if (!this.outputSchema) return;
    const outputValidation = this.outputSchema.validate(this.output);
    if (!outputValidation.success) {
      throw new DataboxSchemaError(
        'The Databox output did not match its Schema',
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
