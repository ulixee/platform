import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import { Helpers } from '@ulixee/databox-testing';
import DataboxWrapper from '../index';
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
    await DataboxWrapper.attemptAutorun();
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
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'true';
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const databoxWrapper = new DataboxWrapper(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org');
      await hero.close();
    });
    expect(connection.outgoingSpy.mock.calls).toHaveLength(0);
    await databoxWrapper.run({});
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
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'true';
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const databoxWrapper = new DataboxWrapper(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org');
    });
    await databoxWrapper.run({});

    const outgoingHeroCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toContain('Session.close');
  });

  it('should emit close hero on error', async () => {
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'true';
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const databoxWrapper = new DataboxWrapper(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org').then(() => {
        throw new Error('test');
      });

      await hero.interact('click');
    });

    await expect(databoxWrapper.run({})).rejects.toThrowError();

    const outgoingHeroCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toContain('Session.close');
  });

  it('should be able to bypass the interaction step', async () => {
    process.env.ULX_DATABOX_DISABLE_AUTORUN = 'true';
    process.env.ULX_EXTRACT_SESSION_ID = '1';
    const connection = createConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const runFn = jest.fn();
    const extractFn = jest.fn();
    const databoxWrapper = new DataboxWrapper({
      run: runFn,
      extract: extractFn,
    });

    await databoxWrapper.run({});
    expect(runFn).not.toHaveBeenCalled();
    expect(extractFn).toHaveBeenCalledTimes(1);
  });
});
