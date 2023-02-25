import readCommandLineArgs from '../lib/utils/readCommandLineArgs';
import Autorun from '../lib/utils/Autorun';
import { Runner } from '../index';

describe('basic Datastore tests', () => {
  it('automatically runs and closes a runner', async () => {
    let runnerWasRun = false;
    Autorun.mainModuleExports = {
      default: new Runner(async ctx => {
        new ctx.Output({ ran: 'success' });
        runnerWasRun = true;
      }),
    };

    await Autorun.attemptAutorun();
    await new Promise(resolve => process.nextTick(resolve));
    expect(await runnerWasRun).toBe(true);
  });

  it('waits until run method is explicitly called', async () => {
    let wasRun = false;
    const runner = new Runner(async ctx => {
      new ctx.Output({ ran: 'success' });
      wasRun = true;
    });

    await runner.runInternal({});
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
