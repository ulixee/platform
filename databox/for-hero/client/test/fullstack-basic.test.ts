import { Helpers } from '@ulixee/databox-testing';
import RunnerObject from '../lib/RunnerObject';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic Full Client tests', () => {
  it('receives DataboxMeta', async () => {
    const databoxInternal = await Helpers.createFullstackDataboxInternal();
    const runnerObject = new RunnerObject(databoxInternal);
    const sessionId = await runnerObject.sessionId;
    expect(sessionId).toBeTruthy();
    await databoxInternal.close();
  });
});
