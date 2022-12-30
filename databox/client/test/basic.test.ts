import readCommandLineArgs from '../lib/utils/readCommandLineArgs';
import Autorun from '../lib/utils/Autorun';
import { Function } from '../index';

describe('basic Databox tests', () => {
  it('automatically runs and closes a function', async () => {
    let functionWasRun = false;
    Autorun.defaultExport = new Function(async ctx => {
      new ctx.Output({ ran: 'success' });
      functionWasRun = true;
    });

    await Autorun.attemptAutorun(Function);
    await new Promise(resolve => process.nextTick(resolve));
    expect(await functionWasRun).toBe(true);
  });

  it('waits until run method is explicitly called', async () => {
    let wasRun = false;
    const func = new Function(async ctx => {
      new ctx.Output({ ran: 'success' });
      wasRun = true;
    });

    await func.stream({});
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
