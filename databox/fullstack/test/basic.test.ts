import { Helpers } from '@ulixee/databox-testing';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic Full Client tests', () => {
  it('receives DataboxMeta', async () => {
    const databoxInteracting = await Helpers.createFullstackDatabox();
    const meta = await databoxInteracting.meta;
    expect(meta.sessionId).toBeTruthy();
    await databoxInteracting.close();
  });
});
