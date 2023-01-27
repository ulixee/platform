import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import BaseSchema from '@ulixee/schema/lib/BaseSchema';
import { DateUtilities, ObjectSchema } from '@ulixee/schema';
import { IValidationError } from '@ulixee/schema/interfaces/IValidationResult';
import { bindFunctions, pickRandom } from '@ulixee/commons/lib/utils';
import StringSchema from '@ulixee/schema/lib/StringSchema';
import DatastoreSchemaError from './DatastoreSchemaError';
import IFunctionSchema, { ExtractSchemaType } from '../interfaces/IFunctionSchema';
import IFunctionExecOptions from '../interfaces/IFunctionExecOptions';
import createOutputGenerator, { IOutputClass } from './Output';
import IObservableChange from '../interfaces/IObservableChange';
import ResultIterable from './ResultIterable';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import IFunctionContext from '../interfaces/IFunctionContext';

export default class FunctionInternal<
  TSchema extends IFunctionSchema<any, any>,
  TOptions extends IFunctionExecOptions<TSchema> = IFunctionExecOptions<TSchema>,
  TInput extends ExtractSchemaType<TSchema['input']> = ExtractSchemaType<TSchema['input']>,
  TOutput extends ExtractSchemaType<TSchema['output']> = ExtractSchemaType<TSchema['output']>,
> extends TypedEventEmitter<{
  close: void;
}> {
  #isClosing: Promise<void>;
  #input: TInput;
  #outputSchema: BaseSchema<any>;

  public readonly outputs: (TOutput & { emit(): void })[] = [];
  public readonly options: TOptions;
  public readonly schema: TSchema;

  public readonly Output: IOutputClass<TOutput>;
  public onOutputChanges: (changes: IObservableChange[]) => any;
  public onOutputRecord: (output: TOutput) => void;

  constructor(options: TOptions, private components: IFunctionComponents<TSchema, any>) {
    super();
    this.options = options;
    this.schema = components.schema;
    this.#input = (options.input ?? {}) as TInput;
    this.Output = createOutputGenerator({
      outputs: this.outputs,
      onOutputChanges: this.defaultOnOutputChanges.bind(this),
      onOutputEmitted: this.onOutputEmitted.bind(this),
    });

    if (components.schema?.inputExamples?.length && components.schema.input) {
      const randomEntry = pickRandom(components.schema.inputExamples);
      for (const [key, schema] of Object.entries(components.schema.input)) {
        if (this.#input[key] === undefined) {
          let value = randomEntry[key];
          if (
            value instanceof DateUtilities &&
            schema instanceof StringSchema &&
            (schema.format === 'date' || schema.format === 'time')
          ) {
            value = value.evaluate(schema.format);
          }
          (this.#input as any)[key] = value;
        }
      }
    }

    if (this.schema?.output) {
      let outputSchema = this.schema.output as unknown as BaseSchema<any>;
      if (!(outputSchema instanceof BaseSchema)) {
        outputSchema = new ObjectSchema({ fields: outputSchema as any });
      }
      this.#outputSchema = outputSchema;
    }
    bindFunctions(this);
  }

  public run(context: IFunctionContext<TSchema>): ResultIterable<TOutput> {
    const functionResults = new ResultIterable<TOutput>();
    this.onOutputRecord = output => functionResults.push(output);

    void Promise.resolve(this.components.run(context))
      .then(this.emitPendingOutputs)
      .then(functionResults.done)
      .catch(functionResults.reject);

    return functionResults;
  }

  public emitPendingOutputs(): void {
    // emit all outputs
    for (const output of this.outputs) output.emit();
  }

  public get isClosing(): boolean {
    return !!this.#isClosing;
  }

  public get input(): TInput {
    if (this.#input && typeof this.#input === 'object') {
      return { ...this.#input };
    }
    return this.#input;
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

  public validateInput(): DatastoreSchemaError {
    if (!this.schema?.input) return;
    const schema = new ObjectSchema({ fields: this.schema.input });
    const inputValidation = schema.validate(this.input);
    if (!inputValidation.success) {
      throw new DatastoreSchemaError(
        'The Function input did not match its Schema',
        inputValidation.errors,
        this.schema.input,
      );
    }
  }

  public validateOutput(output: TOutput, counter: number): void {
    if (!this.#outputSchema) return;

    let humanCounter = ' ';

    if (counter !== null) {
      humanCounter = '1st ';
      if (counter === 2) humanCounter = '2nd ';
      if (counter === 3) humanCounter = '3rd ';
      if (counter >= 4) humanCounter = `${counter}th `;
    }

    const outputValidation = this.#outputSchema.validate(output);
    if (!outputValidation.success) {
      throw new DatastoreSchemaError(
        `The Function's ${humanCounter}Output did not match its Schema`,
        outputValidation.errors,
        output,
      );
    }
  }

  protected onOutputEmitted(output: TOutput): void {
    if (this.schema?.output) {
      // TODO: follow nested schema columns
      for (const key of Object.keys(output)) {
        if (!this.schema.output[key] && !this.schema.output.fields?.[key]) delete output[key];
      }
    }
    this.onOutputRecord?.(output);
  }

  protected defaultOnOutputChanges(output: TOutput, changes: IObservableChange[]): void {
    if (this.onOutputChanges) this.onOutputChanges(changes);
    try {
      this.validateOutput(output, null);
    } catch (err) {
      // NOTE: filter errors to only changed schema elements. Otherwise, we get incomplete object errors
      if (err instanceof DatastoreSchemaError) {
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
        if (validErrors.length) throw new DatastoreSchemaError(err.message, validErrors, output);
      }
    }
  }
}
