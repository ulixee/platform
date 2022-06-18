import readCommandLineArgs from '../lib/utils/readCommandLineArgs';
import DataboxWrapper from '../index';

describe('basic Databox tests', () => {
  it('automatically runs and closes a databox', async () => {
    let databoxWasRun = false;
    DataboxWrapper.defaultExport = new DataboxWrapper(async databox => {
      databox.output = 'success';
      databoxWasRun = true;
    });

    await DataboxWrapper.attemptAutorun();
    await new Promise(resolve => process.nextTick(resolve));
    expect(await databoxWasRun).toBe(true);
  });

  it('waits until run method is explicitly called', async () => {
    let databoxWasRun = false;
    const databoxWrapper = new DataboxWrapper(async databox => {
      databox.output = 'success';
      databoxWasRun = true;
    });

    await databoxWrapper.run({});
    await new Promise(resolve => process.nextTick(resolve));
    expect(await databoxWasRun).toBe(true);
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
