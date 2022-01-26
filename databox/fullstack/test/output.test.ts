import { Helpers } from '@ulixee/databox-testing';
import SessionDb from '@ulixee/databox-core/dbs/SessionDb';
import { Observable } from '@ulixee/databox/lib/ObjectObserver';

beforeAll(async () => {
  Helpers.onClose(() => {}, true);
});
afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('Output tests', () => {
  // it('records object changes', async () => {
  //   const databoxInteracting = await Helpers.createFullstackDatabox();
  //   databoxInteracting.lastExternalId = 4;
  //   const output = databoxInteracting.output;
  //   output.started = new Date();
  //   const url = 'https://example.org';
  //   const title = 'Example Domain';
  //   output.page = {
  //     url,
  //     title,
  //   };
  //   output.page.data = Buffer.from('I am buffer');
  //   const sessionId = await databoxInteracting.sessionId;
  //   await databoxInteracting.close();
  //
  //   const db = new SessionDb(sessionId, { readonly: true });
  //   const outputs = db.output.all();
  //   expect(outputs).toHaveLength(3);
  //   expect(outputs[0]).toEqual({
  //     type: 'insert',
  //     value: expect.any(String),
  //     timestamp: expect.any(Number),
  //     lastCommandId: expect.any(Number),
  //     lastExternalId: 4,
  //     path: '["started"]',
  //   });
  //   expect(outputs[1]).toEqual({
  //     type: 'insert',
  //     value: JSON.stringify({ url, title }),
  //     timestamp: expect.any(Number),
  //     lastCommandId: 0,
  //     lastExternalId: 4,
  //     path: '["page"]',
  //   });
  //   expect(outputs[2]).toEqual({
  //     type: 'insert',
  //     value: JSON.stringify(Buffer.from('I am buffer').toString('base64')),
  //     timestamp: expect.any(Number),
  //     lastCommandId: 0,
  //     lastExternalId: 4,
  //     path: '["page","data"]',
  //   });
  //   expect(JSON.stringify(output)).toEqual(
  //     JSON.stringify({
  //       started: output.started,
  //       page: {
  //         url,
  //         title,
  //         data: Buffer.from('I am buffer').toString('base64'),
  //       },
  //     }),
  //   );
  // });

  it('can add array-ish items to the main object', async () => {
    const databoxInteracting = await Helpers.createFullstackDatabox();
    databoxInteracting.lastExternalId = 2;
    const output = databoxInteracting.output;
    const date = new Date();
    output.push({
      url: 'https://url.com',
      title: 'Page',
      date,
      buffer: Buffer.from('whatever'),
    });
    const sessionId = await databoxInteracting.sessionId;
    await databoxInteracting.close();

    const db = new SessionDb(sessionId, { readonly: true });
    const outputs = db.output.all();
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).toEqual({
      type: 'insert',
      value: JSON.stringify({
        url: 'https://url.com',
        title: 'Page',
        date,
        buffer: Buffer.from('whatever').toString('base64'),
      }),
      timestamp: expect.any(Number),
      lastCommandId: 0,
      lastExternalId: 2,
      path: '[0]',
    });
    expect(JSON.stringify(output)).toEqual(
      JSON.stringify([
        {
          url: 'https://url.com',
          title: 'Page',
          date,
          buffer: Buffer.from('whatever').toString('base64'),
        },
      ]),
    );
  });

  it('can add observables directly', async () => {
    const databoxInteracting = await Helpers.createFullstackDatabox();
    databoxInteracting.lastExternalId = 2;
    const output = databoxInteracting.output;
    const record = Observable({} as any);
    output.push(record);
    record.test = 1;
    record.watch = 2;
    record.any = { more: true };
    const sessionId = await databoxInteracting.sessionId;
    await databoxInteracting.close();

    const db = new SessionDb(sessionId, { readonly: true });
    const outputs = db.output.all();
    expect(outputs).toHaveLength(4);
    expect(outputs[0]).toEqual({
      type: 'insert',
      value: JSON.stringify({}),
      timestamp: expect.any(Number),
      lastCommandId: 0,
      lastExternalId: 2,
      path: '[0]',
    });
    expect(JSON.stringify(output)).toEqual(
      JSON.stringify([
        {
          test: 1,
          watch: 2,
          any: { more: true },
        },
      ]),
    );
  });

  // it('can replace the main object', async () => {
  //   const databoxInteracting = await Helpers.createFullstackDatabox();
  //   databoxInteracting.lastExternalId = 2;
  //   databoxInteracting.output.test = 'true';
  //   databoxInteracting.output = {
  //     try: true,
  //     another: false,
  //   };
  //   const sessionId = await databoxInteracting.sessionId;
  //   await databoxInteracting.close();
  //
  //   const db = new SessionDb(sessionId, { readonly: true });
  //   const outputs = db.output.all();
  //   expect(outputs).toHaveLength(4);
  //   expect(outputs[0]).toEqual({
  //     type: 'insert',
  //     value: JSON.stringify('true'),
  //     timestamp: expect.any(Number),
  //     lastCommandId: 0,
  //     lastExternalId: 2,
  //     path: '["test"]',
  //   });
  //   expect(outputs[1]).toEqual({
  //     type: 'delete',
  //     value: null,
  //     timestamp: expect.any(Number),
  //     lastCommandId: 0,
  //     lastExternalId: 2,
  //     path: '["test"]',
  //   });
  //   expect(outputs[2]).toEqual({
  //     type: 'insert',
  //     value: JSON.stringify(true),
  //     timestamp: expect.any(Number),
  //     lastCommandId: 0,
  //     lastExternalId: 2,
  //     path: '["try"]',
  //   });
  //   expect(JSON.stringify(databoxInteracting.output)).toEqual(
  //     JSON.stringify({
  //       try: true,
  //       another: false,
  //     }),
  //   );
  // });
});
