import { ConnectionToCore as ConnectionToHeroCore } from '@ulixee/hero';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import ICoreRequestPayload from '@ulixee/hero-interfaces/ICoreRequestPayload';
import ICoreResponsePayload from '@ulixee/hero-interfaces/ICoreResponsePayload';
import { Helpers } from '@ulixee/databox-testing';
import DataboxPackage from '../index';
import readCommandLineArgs from '../lib/utils/readCommandLineArgs';

afterAll(Helpers.afterAll);

class MockedConnectionToHeroCore extends ConnectionToHeroCore {
  public readonly outgoing = jest.fn(
    async ({ command }: ICoreRequestPayload): Promise<ICoreResponsePayload> => {
      if (command === 'Core.createSession') {
        return {
          data: { sessionId: 'session-id' },
        };
      }
      if (command === 'Session.getCollectedFragments') {
        return {
          data: [],
        };
      }
      if (command === 'Session.getCollectedResources') {
        return {
          data: [],
        };
      }
    },
  );

  async internalSendRequest(payload: ICoreRequestPayload): Promise<void> {
    const response = await this.outgoing(payload);
    this.onMessage({
      responseId: payload.messageId,
      data: response?.data ?? {},
      ...(response ?? {}),
    });
  }

  protected createConnection = () => Promise.resolve(null);
  protected destroyConnection = () => Promise.resolve(null);
}

describe('basic Databox tests', () => {
  it('automatically runs and closes a databox', async () => {
    const connection = new MockedConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const ranScript = await new Promise(resolve => {
      // eslint-disable-next-line no-new
      new DataboxPackage(async databox => {
        await databox.hero;
        resolve(true);
      });
    });
    await new Promise(resolve => process.nextTick(resolve));
    expect(ranScript).toBe(true);

    const outgoingCommands = connection.outgoing.mock.calls;
    expect(outgoingCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.close',
      'Core.disconnect',
    ]);
  });

  it('waits until run method is explicitly called', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    const connection = new MockedConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const packagedDatabox = new DataboxPackage(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org');
      await hero.close();
    });
    expect(connection.outgoing.mock.calls).toHaveLength(0);
    await packagedDatabox.run();
    const outgoingHeroCommands = connection.outgoing.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Tab.goto',
      'Session.close',
      'Core.disconnect',
    ]);
  });

  it('should call close on hero automatically', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    const connection = new MockedConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const packagedDatabox = new DataboxPackage(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org');
    });
    await packagedDatabox.run();

    const outgoingHeroCommands = connection.outgoing.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toContain('Session.close');
  });

  it('should emit close hero on error', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    const connection = new MockedConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);
    const packagedDatabox = new DataboxPackage(async databox => {
      const hero = databox.hero;
      await hero.goto('https://news.ycombinator.org').then(() => {
        throw new Error('test');
      });

      await hero.interact('click');
    });

    await expect(packagedDatabox.run()).rejects.toThrowError();

    const outgoingHeroCommands = connection.outgoing.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toContain('Session.close');
  });

  it('should be able to bypass the interaction step', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    process.env.HERO_EXTRACT_SESSION_ID = '1';
    const connection = new MockedConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const interactFn = jest.fn();
    const extractFn = jest.fn();
    const packagedDatabox = new DataboxPackage({
      interact: interactFn,
      extract: extractFn,
    });

    await packagedDatabox.run();
    expect(interactFn).not.toHaveBeenCalled();
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
