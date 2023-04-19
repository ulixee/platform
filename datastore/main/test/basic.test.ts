import readCommandLineArgs from '../lib/utils/readCommandLineArgs';
import { Extractor } from '../index';

describe('basic Datastore tests', () => {
  it('waits until run method is explicitly called', async () => {
    let wasRun = false;
    const extractor = new Extractor(async ctx => {
      new ctx.Output({ ran: 'success' });
      wasRun = true;
    });

    await extractor.runInternal({});
    await new Promise(resolve => process.nextTick(resolve));
    expect(await wasRun).toBe(true);
  });

  it('can read command line args', async () => {
    process.argv[2] = '--input.city=Atlanta';
    process.argv[3] = '--input.state="GA"';
    process.argv[4] = '--input.address.number=9145';
    process.argv[5] = '--input.address.street="Street Street"';
    expect(readCommandLineArgs()).toEqual({
      input: {
        city: 'Atlanta',
        state: 'GA',
        address: {
          number: 9145,
          street: 'Street Street',
        },
      },
    });
  });
});
