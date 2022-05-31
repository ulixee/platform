import { Helpers } from '@ulixee/databox-testing';
import DataboxRunner from '../lib/Runner';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic Full Client tests', () => {
  it('receives DataboxMeta', async () => {
    const databoxInternal = await Helpers.createFullstackDataboxInternal();
    const databoxRunner = new DataboxRunner(databoxInternal);
    const sessionId = await databoxRunner.sessionId;
    expect(sessionId).toBeTruthy();
    await databoxInternal.close();
  });
});
