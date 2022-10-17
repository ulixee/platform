import { Helpers } from '@ulixee/databox-testing';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic Full Client tests', () => {
  it('receives DataboxMeta', async () => {
    const { databoxRunnerObject, databoxClose } = await Helpers.createFullstackDatabox();
    const sessionId = await databoxRunnerObject.hero.sessionId;
    expect(sessionId).toBeTruthy();
    await databoxClose();
  });
});
