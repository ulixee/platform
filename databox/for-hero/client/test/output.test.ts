import { Helpers } from '@ulixee/databox-testing';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import DataboxInternal from '../lib/DataboxInternal';
import MockConnectionToHeroCore from './_MockConnectionToHeroCore';

afterAll(Helpers.afterAll);

describe('basic output tests', () => {
  it('sends output changes to server', async () => {
    const connection = new MockConnectionToHeroCore(({ command, messageId: responseId }) => {
      const response = {
        responseId,
        data: {},
      };
      if (command === 'Core.createSession') response.data = { sessionId: 'session-id' };

      return response;
    });
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    const databoxInternal = new DataboxInternal<any, any>({});
    databoxInternal.output.test = true;
    await databoxInternal.close();

    const outgoingCommands = connection.outgoingSpy.mock.calls;
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
