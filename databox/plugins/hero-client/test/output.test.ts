import { Helpers } from '@ulixee/databox-testing';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import { buffer, date, object, string } from '@ulixee/schema';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import { Function, Observable } from '@ulixee/databox';
import { HeroFunctionPlugin } from '../index';
import MockConnectionToHeroCore from './_MockConnectionToHeroCore';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic output tests', () => {
  it('sends output changes to core', async () => {
    const connection = new MockConnectionToHeroCore(({ command, messageId: responseId }) => {
      const response = {
        responseId,
        data: {},
      };
      if (command === 'Core.createSession') response.data = { sessionId: 'session-id' };

      return response;
    });
    jest.spyOn(ConnectionFactory, 'createConnection').mockImplementationOnce(() => connection);

    await new Function(ctx => {
      const output = new ctx.Output();
      output.test = true;
    }, HeroFunctionPlugin).exec({});

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

  it('records object changes', async () => {
    const schema = {
      output: {
        started: date(),
        page: object({
          fields: {
            url: string(),
            title: string(),
            data: buffer({ optional: true }),
          },
        }),
      },
    };
    const { functionContext, databoxForHeroPlugin, databoxClose } =
      await Helpers.createFullstackDatabox(schema);
    const output = new functionContext.Output();
    output.started = new Date();
    const url = 'https://example.org';
    const title = 'Example Domain';
    output.page = {
      url,
      title,
    };
    output.page.data = Buffer.from('I am buffer');
    const sessionId = await databoxForHeroPlugin.hero.sessionId;
    await databoxClose();
    await new Promise(resolve => setTimeout(resolve, 100));

    const db = new SessionDb(sessionId, { readonly: true });
    const outputs = db.output.all();
    expect(outputs).toHaveLength(3);
    expect(outputs[0]).toEqual({
      type: 'insert',
      value: expect.any(Date),
      timestamp: expect.any(Number),
      lastCommandId: expect.any(Number),
      path: '["started"]',
    });
    expect(outputs[1]).toEqual({
      type: 'insert',
      value: { url, title },
      timestamp: expect.any(Number),
      lastCommandId: 0,
      path: '["page"]',
    });
    expect(outputs[2]).toEqual({
      type: 'insert',
      value: Buffer.from('I am buffer'),
      timestamp: expect.any(Number),
      lastCommandId: 0,
      path: '["page","data"]',
    });
    expect(JSON.stringify(output)).toEqual(
      JSON.stringify({
        started: output.started,
        page: {
          url,
          title,
          data: Buffer.from('I am buffer'),
        },
      }),
    );
  });

  it('can add observables directly', async () => {
    const { functionContext, databoxForHeroPlugin, databoxClose } =
      await Helpers.createFullstackDatabox();
    const output = new functionContext.Output();
    const record = Observable({} as any);
    output.records = [record];
    record.test = 1;
    record.watch = 2;
    record.any = { more: true };
    const sessionId = await databoxForHeroPlugin.hero.sessionId;
    await databoxClose();
    await new Promise(resolve => setTimeout(resolve, 100));

    const db = new SessionDb(sessionId, { readonly: true });
    const outputs = db.output.all();
    expect(outputs).toHaveLength(4);
    expect(outputs[0]).toEqual({
      type: 'insert',
      value: [{}],
      timestamp: expect.any(Number),
      lastCommandId: 0,
      path: '["records"]',
    });
    expect(JSON.stringify(output)).toEqual(
      JSON.stringify({
        records: [
          {
            test: 1,
            watch: 2,
            any: { more: true },
          },
        ],
      }),
    );
  });
});
