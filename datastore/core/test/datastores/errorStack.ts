import { Extractor } from '@ulixee/datastore';
import { InvalidSignatureError } from '@ulixee/platform-utils/lib/errors';

export default new Extractor({
  async run(ctx) {
    const y = await multiply(2);
    ctx.Output.emit({ y });
  },
});

const multiply = async (x: number): Promise<number> => {
  for (let i = 0; i <= 100; i += 1) {
    await new Promise(process.nextTick);
    x += i ** 2;
    if (i === 99) throw new InvalidSignatureError('ERROR!!!');
  }
  return x;
};
