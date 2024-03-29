import Resolvable from '@ulixee/commons/lib/Resolvable';
import { Extractor, Observable } from '@ulixee/datastore';
import { Helpers } from '@ulixee/datastore-testing';
// eslint-disable-next-line import/no-extraneous-dependencies
import OutputRebuilder from '@ulixee/desktop-core/lib/OutputRebuilder';
import { ConnectionToHeroCore } from '@ulixee/hero';
import Core from '@ulixee/hero-core';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { buffer, date, object, string } from '@ulixee/schema';
import { HeroExtractorPlugin } from '../index';
import MockConnectionToHeroCore from './_MockConnectionToHeroCore';

let connectionToCore: ConnectionToHeroCore;
const core = new Core();
beforeAll(() => {
  const bridge = new TransportBridge();
  core.addConnection(bridge.transportToClient);
  connectionToCore = new ConnectionToHeroCore(bridge.transportToCore);
  Helpers.onClose(() => connectionToCore.disconnect(), true);
});
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

    await new Extractor(async ctx => {
      const output = new ctx.Output();
      output.test = true;
      const hero = new ctx.Hero();
      await hero.sessionId;
    }, HeroExtractorPlugin).runInternal({});

    const outgoingCommands = connection.outgoingSpy.mock.calls;
    expect(outgoingCommands.map(c => c[0].command)).toMatchObject([
      'Core.connect',
      'Core.createSession',
      'Session.flush',
      'Session.close',
      'Core.disconnect',
    ]);
    const outputChange = outgoingCommands[2][0].recordCommands[0].args[1];
    expect(outputChange).toMatchObject({
      type: 'insert',
      value: true,
      path: '[0,"test"]',
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
            title: string({ optional: false }),
            data: buffer({ optional: true }),
          },
        }),
      },
    };

    const sessionIdPromise = new Resolvable<string>();
    const started = new Date();
    let stringified: string;
    const url = 'https://example.org';
    const title = 'Example Domain';
    const extractor = new Extractor(
      {
        async run({ Output, Hero }) {
          const output = new Output();
          output.started = started;
          output.page = {
            url,
            title,
          };
          output.page.data = Buffer.from('I am buffer');
          stringified = JSON.stringify(output);
          const hero = new Hero();
          const sessionId = await hero.sessionId;

          sessionIdPromise.resolve(sessionId);
        },
        schema,
      },
      HeroExtractorPlugin,
    );
    await extractor.runInternal({ connectionToCore });

    const sessionId = await sessionIdPromise;
    const db = await core.sessionRegistry.get(sessionId);
    const outputs = db.output.all();
    expect(outputs).toHaveLength(4);
    expect(outputs[1]).toEqual({
      type: 'insert',
      value: expect.any(Date),
      timestamp: expect.any(Number),
      lastCommandId: expect.any(Number),
      path: '[0,"started"]',
    });
    expect(outputs[2]).toEqual({
      type: 'insert',
      value: { url, title },
      timestamp: expect.any(Number),
      lastCommandId: 0,
      path: '[0,"page"]',
    });
    expect(outputs[3]).toEqual({
      type: 'insert',
      value: Buffer.from('I am buffer'),
      timestamp: expect.any(Number),
      lastCommandId: 0,
      path: '[0,"page","data"]',
    });
    expect(stringified).toEqual(
      JSON.stringify({
        started,
        page: {
          url,
          title,
          data: Buffer.from('I am buffer'),
        },
      }),
    );

    const rebuilder = new OutputRebuilder();
    rebuilder.applyChanges(outputs);
    expect(rebuilder.getLatestSnapshot().output).toEqual([
      {
        started,
        page: {
          url,
          title,
          data: Buffer.from('I am buffer'),
        },
      },
    ]);
  });

  it('can add observables directly', async () => {
    const sessionIdPromise = new Resolvable<string>();
    let stringified: string;

    const extractor = new Extractor(async ({ Output, Hero }) => {
      const output = new Output();
      const record = Observable({} as any);
      output.records = [record];
      record.test = 1;
      record.watch = 2;
      record.any = { more: true };
      stringified = JSON.stringify(output);
      const hero = new Hero();
      const sessionId = await hero.sessionId;

      sessionIdPromise.resolve(sessionId);
    }, HeroExtractorPlugin);
    await extractor.runInternal({ connectionToCore });

    const sessionId = await sessionIdPromise;

    const db = await core.sessionRegistry.get(sessionId);
    const outputs = db.output.all();
    expect(outputs).toHaveLength(5);
    expect(outputs[1]).toEqual({
      type: 'insert',
      value: [{}],
      timestamp: expect.any(Number),
      lastCommandId: 0,
      path: '[0,"records"]',
    });
    expect(stringified).toEqual(
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
