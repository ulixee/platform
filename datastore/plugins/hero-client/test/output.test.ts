import { Helpers } from '@ulixee/datastore-testing';
import ConnectionFactory from '@ulixee/hero/connections/ConnectionFactory';
import { buffer, date, object, string } from '@ulixee/schema';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import { Runner, Observable } from '@ulixee/datastore';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import Core from '@ulixee/hero-core';
import { ConnectionToHeroCore } from '@ulixee/hero';
import Resolvable from '@ulixee/commons/lib/Resolvable';
// eslint-disable-next-line import/no-extraneous-dependencies
import OutputRebuilder from '@ulixee/desktop-core/lib/OutputRebuilder';
import MockConnectionToHeroCore from './_MockConnectionToHeroCore';
import { HeroRunnerPlugin } from '../index';

let connectionToCore: ConnectionToHeroCore;
beforeAll(() => {
  const bridge = new TransportBridge();
  Core.addConnection(bridge.transportToClient);
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

    await new Runner(async ctx => {
      const output = new ctx.Output();
      output.test = true;
      const hero = new ctx.Hero();
      await hero.sessionId;
    }, HeroRunnerPlugin).runInternal({});

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
    const runner = new Runner(
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
      HeroRunnerPlugin,
    );
    await runner.runInternal({ connectionToCore });

    const sessionId = await sessionIdPromise;
    const db = new SessionDb(sessionId, { readonly: true });
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

    const runner = new Runner(async ({ Output, Hero }) => {
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
    }, HeroRunnerPlugin);
    await runner.runInternal({ connectionToCore });

    const sessionId = await sessionIdPromise;

    const db = new SessionDb(sessionId, { readonly: true });
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
