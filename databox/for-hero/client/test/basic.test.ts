import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import { Helpers } from '@ulixee/databox-testing';
import DataboxWrapper from '../index';
import readCommandLineArgs from '../lib/utils/readCommandLineArgs';
import MockConnectionToHeroCore from './_MockConnectionToHeroCore';

afterAll(Helpers.afterAll);

function createConnectionToHeroCore() {
  return new MockConnectionToHeroCore(({ command, messageId: responseId }) => {
    if (command === 'Core.createSession') {
      return {
        responseId,
        data: { sessionId: 'session-id' },
      };
    }
    if (command === 'Session.getCollectedElements') {
      return {
        responseId,
        data: [],
      };
    }
    if (command === 'Session.getCollectedResources') {
      return {
        responseId,
        data: [],
      };
    }
    return { responseId, data: {} };
  });
}

describe('basic Databox tests', () => {
  it('automatically runs and closes a databox', async () => {
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const ranScript = new Promise(resolve => {
      DataboxWrapper.defaultExport = new DataboxWrapper(async databox => {
        await databox.hero;
        resolve(true);
      });
    });
    await DataboxWrapper.tryAutorunDatabox();
    await new Promise(resolve => process.nextTick(resolve));
    expect(await ranScript).toBe(true);

    const outgoingCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.close',
      'Core.disconnect',
    ]);
  });

  it('waits until run method is explicitly called', async () => {
    DataboxWrapper.disableAutorun = true;
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const databoxWrapper = new DataboxWrapper(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org');
      await hero.close();
    });
    expect(connection.outgoingSpy.mock.calls).toHaveLength(0);
    await databoxWrapper.run();
    const outgoingHeroCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Tab.goto',
      'Session.close',
      'Core.disconnect',
    ]);
  });

  it('should call close on hero automatically', async () => {
    DataboxWrapper.disableAutorun = true;
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const databoxWrapper = new DataboxWrapper(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org');
    });
    await databoxWrapper.run();

    const outgoingHeroCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toContain('Session.close');
  });

  it('should emit close hero on error', async () => {
    DataboxWrapper.disableAutorun = true;
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const databoxWrapper = new DataboxWrapper(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org').then(() => {
        throw new Error('test');
      });

      await hero.interact('click');
    });

    await expect(databoxWrapper.run()).rejects.toThrowError();

    const outgoingHeroCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toContain('Session.close');
  });

  it('should be able to bypass the interaction step', async () => {
    DataboxWrapper.disableAutorun = true;
    process.env.ULX_EXTRACT_SESSION_ID = '1';
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const runFn = jest.fn();
    const extractFn = jest.fn();
    const databoxWrapper = new DataboxWrapper({
      run: runFn,
      extract: extractFn,
    });

    await databoxWrapper.run();
    expect(runFn).not.toHaveBeenCalled();
    expect(extractFn).toHaveBeenCalledTimes(1);
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
