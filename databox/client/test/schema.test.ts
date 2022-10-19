import { array, boolean, number, object, string } from '@ulixee/schema';
import Databox from '../index';

describe('Schemas', () => {
  it('will validate input to a databox', async () => {
    const schema = {
      input: {
        req: string(),
      },
    };

    const dbx = new Databox({
      async run(databox) {
        databox.output = { test: true };
      },
      schema,
    });

    await expect(dbx.exec({ input: {} as any })).rejects.toThrowError('input did not match');
  });

  it('will validate output errors for a databox', async () => {
    const schema = {
      output: {
        test: string(),
      },
    };

    const dbx = new Databox({
      async run(databox) {
        // @ts-expect-error
        databox.output = { test: 1 };
      },
      schema,
    });

    await expect(dbx.exec({})).rejects.toThrowError('output did not match');
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
    const dbx = new Databox({
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

    await expect(dbx.exec({})).rejects.toThrowError('output did not match');
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

    const dbx = new Databox({
      async run(databox) {
        databox.output.test = 'good to go';
      },
      schema,
    });

    await expect(dbx.exec({ input: { url: 'https://url.com' } })).resolves.toEqual(
      expect.objectContaining({
        test: 'good to go',
      }),
    );
  });
});
