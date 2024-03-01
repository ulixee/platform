import { array, boolean, dateAdd, number, object, string, ExtractSchemaType } from '@ulixee/schema';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import *  as moment from 'moment';
import { Extractor, ExtractorSchema } from '../index';

describe('Schemas', () => {
  it('will validate input to a funner', async () => {
    const schema = {
      input: {
        req: string(),
      },
    };

    const extractor = new Extractor({
      async run(ctx) {
        ctx.Output.emit({ test: true });
      },
      schema,
    });

    await expect(extractor.runInternal({ input: {} as any })).rejects.toThrow(
      'input did not match',
    );
  });

  it('will supply defaults to params if not given', async () => {
    const schema = ExtractorSchema({
      input: {
        plan: boolean(),
        for: number(),
        a: string({ optional: true }),
        date: string({ format: 'date' }),
      },
      inputExamples: [
        {
          date: dateAdd(1, 'days'),
          plan: true,
        },
      ],
    });

    const runResolver = new Resolvable<ExtractSchemaType<(typeof schema)['input']>>();
    const extractor = new Extractor({
      async run(ctx) {
        runResolver.resolve(ctx.input);
        ctx.Output.emit({ test: true });
      },
      schema,
    });

    await expect(
      extractor.runInternal({ input: { plan: false, for: 1 } } as any),
    ).resolves.toBeTruthy();
    const input = await runResolver;
    expect(input.date).toBe(moment().add(1, 'days').format('YYYY-MM-DD'));
    expect(input.plan).toBe(false);
    expect(input.a).toBeUndefined();
  });

  it('will validate output errors for a extractor', async () => {
    const schema = {
      output: {
        test: string(),
      },
    };

    const extractor = new Extractor({
      async run(ctx) {
        // @ts-expect-error
        ctx.Output.emit({ test: 1 });
      },
      schema,
    });

    await expect(extractor.runInternal({})).rejects.toThrow('Output did not match');
  });

  it('will validate output and abort at the first error', async () => {
    const schema = {
      output: {
        str: string(),
        arr: array(
          object({
            num: number(),
            bool: boolean(),
          }),
        ),
      },
    };

    let counter = 0;
    const extractor = new Extractor({
      schema,
      async run({ Output }) {
        const output = new Output();
        output.str = 'test';
        counter += 1;
        output.arr = [];
        counter += 1;
        // @ts-expect-error
        output.arr.push({ num: 't', bool: true });
        counter += 1;
      },
    });

    await expect(extractor.runInternal({})).rejects.toThrow('Output did not match');
    expect(counter).toBe(2);
  });

  it('will allow valid output for a datastore', async () => {
    const schema = {
      input: {
        url: string({ format: 'url' }),
      },
      output: {
        test: string(),
      },
    };

    const extractor = new Extractor({
      async run(ctx) {
        new ctx.Output({ test: 'good to go' });
      },
      schema,
    });

    await expect(extractor.runInternal({ input: { url: 'https://url.com' } })).resolves.toEqual([
      {
        test: 'good to go',
      },
    ]);
  });
});
