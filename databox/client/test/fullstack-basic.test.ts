import { Helpers } from '@ulixee/databox-testing';
import DataboxInteractor from '../lib/Interactor';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic Full Client tests', () => {
  it('receives DataboxMeta', async () => {
    const databoxInternal = await Helpers.createFullstackDataboxInternal();
    const databoxInteractor = new DataboxInteractor(databoxInternal);
    const sessionId = await databoxInteractor.sessionId;
    expect(sessionId).toBeTruthy();
    await databoxInternal.close();
  });
});
