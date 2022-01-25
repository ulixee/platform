import { ConnectionToCore as ConnectionToHeroCore } from '@ulixee/hero';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import ICoreRequestPayload from '@ulixee/databox-interfaces/ICoreRequestPayload';
import ICoreResponsePayload from '@ulixee/databox-interfaces/ICoreResponsePayload';
import { Helpers } from '@ulixee/databox-testing';
import ConnectionToDataboxCore from '@ulixee/databox/connections/ConnectionToCore';
import Herobox from '../index';

afterAll(Helpers.afterAll);

class MockedConnectionToDataboxCore extends ConnectionToDataboxCore {
  public hostOrError = Promise.resolve('test1');

  public readonly outgoing = jest.fn(
    async ({ command }: ICoreRequestPayload): Promise<ICoreResponsePayload> => {
      if (command === 'Core.createSession') {
        return {
          data: { sessionId: 'session-id' },
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

describe('basic Herobox tests', () => {
  it('waits until run method is explicitly called', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    let lastExternalId = 0;
    const connectionToDataboxCore = new MockedConnectionToDataboxCore();
    const connectionToHeroCore = new MockedConnectionToHeroCore();
    jest
      .spyOn(ConnectionFactory, 'createConnection')
      .mockImplementationOnce(() => connectionToHeroCore);
    const packagedDatabox = new Herobox(async herobox => {
      const hero = herobox.hero;
      await hero.goto('https://news.ycombinator.org');
      await hero.close();
      lastExternalId = herobox.lastExternalId;
    });
    await packagedDatabox.run({ connectionToCore: connectionToDataboxCore });
    expect(lastExternalId).toBe(2);

    const outgoingDataboxCommands = connectionToDataboxCore.outgoing.mock.calls;
    expect(outgoingDataboxCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.close',
    ]);

    const outgoingHeroCommands = connectionToHeroCore.outgoing.mock.calls;
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
    const connectionToDataboxCore = new MockedConnectionToDataboxCore();
    const connectionToHeroCore = new MockedConnectionToHeroCore();
    jest
      .spyOn(ConnectionFactory, 'createConnection')
      .mockImplementationOnce(() => connectionToHeroCore);
    const packagedDatabox = new Herobox(async herobox => {
      const hero = herobox.hero;
      await hero.goto('https://news.ycombinator.org');
    });
    await packagedDatabox.run({ connectionToCore: connectionToDataboxCore });

    const outgoingHeroCommands = connectionToHeroCore.outgoing.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Tab.goto',
      'Session.close',
      'Core.disconnect',
    ]);
  });

  it('should emit close hero on error', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    const connectionToDataboxCore = new MockedConnectionToDataboxCore();
    const connectionToHeroCore = new MockedConnectionToHeroCore();
    jest
      .spyOn(ConnectionFactory, 'createConnection')
      .mockImplementationOnce(() => connectionToHeroCore);
    const packagedDatabox = new Herobox(async herobox => {
      const hero = herobox.hero;
      await hero.goto('https://news.ycombinator.org').then(() => {
        throw new Error('test');
      });

      await hero.interact('click');
    });

    await expect(
      packagedDatabox.run({ connectionToCore: connectionToDataboxCore }),
    ).rejects.toThrowError();

    const outgoingHeroCommands = connectionToHeroCore.outgoing.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Tab.goto',
      'Session.close',
      'Core.disconnect',
    ]);
  });

  it('should be able to bypass the interaction step', async () => {
    process.env.DATABOX_RUN_LATER = 'true';
    process.env.HERO_EXTRACT_SESSION_ID = '1';
    const connectionToDataboxCore = new MockedConnectionToDataboxCore();
    const connectionToHeroCore = new MockedConnectionToHeroCore();
    jest
      .spyOn(ConnectionFactory, 'createConnection')
      .mockImplementationOnce(() => connectionToHeroCore);

    const interactFn = jest.fn();
    const extractFn = jest.fn();
    const packagedDatabox = new Herobox(interactFn).extract(extractFn);

    await packagedDatabox.run({ connectionToCore: connectionToDataboxCore });
    expect(interactFn).not.toHaveBeenCalled();
    expect(extractFn).toHaveBeenCalledTimes(1);

    const outgoingHeroCommands = connectionToHeroCore.outgoing.mock.calls;
    expect(outgoingHeroCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.close',
      'Core.disconnect',
    ]);
  });
});
