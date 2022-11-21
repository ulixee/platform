import { array, boolean, number, object, string } from '@ulixee/schema';
import { Function } from '../index';

describe('Schemas', () => {
  it('will validate input to a function', async () => {
    const schema = {
      input: {
        req: string(),
      },
    };

    const func = new Function({
      async run(ctx) {
        ctx.output = { test: true };
      },
      schema,
    });

    await expect(func.exec({ input: {} as any })).rejects.toThrowError('input did not match');
  });

  it('will validate output errors for a function', async () => {
    const schema = {
      output: {
        test: string(),
      },
    };

    const func = new Function({
      async run(ctx) {
        // @ts-expect-error
        ctx.output = { test: 1 };
      },
      schema,
    });

    await expect(func.exec({})).rejects.toThrowError('output did not match');
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
    const func = new Function({
      schema,
      async run({ output }) {
        output.str = 'test';
        counter += 1;
        output.arr = [];
        counter += 1;
        // @ts-expect-error
        output.arr.push({ num: 't', bool: true });
        counter += 1;
      },
    });

    await expect(func.exec({})).rejects.toThrowError('output did not match');
    expect(counter).toBe(2);
  });

  it('will allow valid output for a databox', async () => {
    const schema = {
      input: {
        url: string({ format: 'url' }),
      },
      output: {
        test: string(),
      },
    };

    const func = new Function({
      async run(ctx) {
        ctx.output.test = 'good to go';
      },
      schema,
    });

    await expect(func.exec({ input: { url: 'https://url.com' } })).resolves.toEqual(
      expect.objectContaining({
        test: 'good to go',
      }),
    );
  });
});
