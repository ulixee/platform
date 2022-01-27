import { Helpers } from '@ulixee/databox-testing';
import ICoreRequestPayload from '@ulixee/hero-interfaces/ICoreRequestPayload';
import ICoreResponsePayload from '@ulixee/hero-interfaces/ICoreResponsePayload';
import { ConnectionToCore as ConnectionToHeroCore } from '@ulixee/hero';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import DataboxInternal from '../lib/DataboxInternal';

afterAll(Helpers.afterAll);

class MockedConnectionToHeroCore extends ConnectionToHeroCore {
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

describe('basic output tests', () => {
  it('sends output changes to server', async () => {
    const connection = new MockedConnectionToHeroCore();
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const databoxInternal = new DataboxInternal({});
    databoxInternal.output.test = true;
    await databoxInternal.close();

    const outgoingCommands = connection.outgoing.mock.calls;
    expect(outgoingCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.flush',
      'Session.close',
      'Core.disconnect',
    ]);

    const outputChange = outgoingCommands[2][0].recordCommands[0].args[0];
    expect(outputChange).toMatchObject({
      type: 'insert',
      value: true,
      path: '["test"]',
      timestamp: expect.any(Number),
      lastCommandId: 0,
    });
  });
});
