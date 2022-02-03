import ICollectedSnippet from '@ulixee/hero-interfaces/ICollectedSnippet';

export default class CollectedSnippets {
  constructor(private readonly getSnippets: (name: string) => Promise<ICollectedSnippet[]>) {}

  async get<T>(name: string): Promise<T> {
    const snippets = await this.getSnippets(name);
    if (snippets.length) return snippets[0].value as T;
    return null;
  }

  getAll(name: string): Promise<ICollectedSnippet[]> {
    return this.getSnippets(name);
  }
}
