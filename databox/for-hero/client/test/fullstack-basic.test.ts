import { Helpers } from '@ulixee/databox-testing';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic Full Client tests', () => {
  it('receives DataboxMeta', async () => {
    const { databoxObject, databoxClose } = await Helpers.createFullstackDatabox();
    const sessionId = await databoxObject.hero.sessionId;
    expect(sessionId).toBeTruthy();
    await databoxClose();
  });
});
