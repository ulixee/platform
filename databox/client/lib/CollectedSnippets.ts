import ICollectedSnippet from '@ulixee/hero-interfaces/ICollectedSnippet';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';

export default class CollectedSnippets {
  readonly #coreSessionPromise: Promise<ICoreSession>;
  readonly #sessionIdPromise: Promise<string>;

  constructor(coreSessionPromise: Promise<ICoreSession>, sessionIdPromise: Promise<string>) {
    this.#coreSessionPromise = coreSessionPromise;
    this.#sessionIdPromise = sessionIdPromise;
  }

  async get<T>(name: string): Promise<T> {
    const [coreSession, sessionId] = await Promise.all([this.#coreSessionPromise, this.#sessionIdPromise]);
    const snippets = await coreSession.getCollectedSnippets(sessionId, name);
    if (snippets.length) return snippets[0].value as T;
    return null;
  }

  async getAll(name: string): Promise<ICollectedSnippet[]> {
    const [coreSession, sessionId] = await Promise.all([this.#coreSessionPromise, this.#sessionIdPromise]);
    return coreSession.getCollectedSnippets(sessionId, name);
  }
}
