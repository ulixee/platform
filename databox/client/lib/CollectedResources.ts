import ICollectedResource from '@ulixee/hero-interfaces/ICollectedResource';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';

export default class CollectedResources {
  readonly #coreSessionPromise: Promise<ICoreSession>;
  readonly #sessionIdPromise: Promise<string>;

  constructor(coreSessionPromise: Promise<ICoreSession>, sessionIdPromise: Promise<string>) {
    this.#coreSessionPromise = coreSessionPromise;
    this.#sessionIdPromise = sessionIdPromise;
  }

  get names(): Promise<string[]> {
    return Promise.all([this.#coreSessionPromise, this.#sessionIdPromise]).then(
      async ([coreSession, sessionId]) => {
        const names = await coreSession.getCollectedAssetNames(sessionId);
        return names.resources;
      },
    );
  }

  async get(name: string): Promise<ICollectedResource> {
    const [coreSession, sessionId] = await Promise.all([
      this.#coreSessionPromise,
      this.#sessionIdPromise,
    ]);
    const resources = await coreSession.getCollectedResources(sessionId, name);
    return resources.length ? resources[0] : null;
  }

  async getAll(name: string): Promise<ICollectedResource[]> {
    const [coreSession, sessionId] = await Promise.all([
      this.#coreSessionPromise,
      this.#sessionIdPromise,
    ]);
    return coreSession.getCollectedResources(sessionId, name);
  }
}
