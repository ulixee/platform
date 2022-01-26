import ICoreRequestPayload from '@ulixee/databox-interfaces/ICoreRequestPayload';
import ICoreResponsePayload from '@ulixee/databox-interfaces/ICoreResponsePayload';
import { Helpers } from '@ulixee/databox-testing';
import ConnectionToCore from '../connections/ConnectionToCore';

afterAll(Helpers.afterAll);

describe('basic output tests', () => {
  it('sends output changes to server', async () => {
    const outgoing = jest.fn(
      async ({ command }: ICoreRequestPayload): Promise<ICoreResponsePayload> => {
        if (command === 'Core.createSession') {
          return {
            data: { sessionId: 'session-id' },
          };
        }
      },
    );

    class MockedConnectionToCore extends ConnectionToCore {
      public async internalSendRequest(payload: ICoreRequestPayload): Promise<void> {
        const response = await outgoing(payload);
        this.onMessage({
          responseId: payload.messageId,
          data: response?.data ?? {},
          ...(response ?? {}),
        });
      }

      protected createConnection = () => Promise.resolve(null);
      protected destroyConnection = () => Promise.resolve(null);
    }

    const databox = await Helpers.createClientDatabox({
      connectionToCore: new MockedConnectionToCore(),
    });
    databox.output.test = true;
    await databox.close();

    const outgoingCommands = outgoing.mock.calls;
    expect(outgoingCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.flush',
      'Session.close',
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
