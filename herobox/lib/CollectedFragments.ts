import ICollectedFragment from '@ulixee/hero-interfaces/ICollectedFragment';
import { DOMParser } from 'linkedom';

export default class CollectedFragments {
  #domParser = new DOMParser();
  #collectedFragmentsByName = new Map<string, ICollectedFragment[]>();
  constructor(private readonly getFragments: (name: string) => Promise<ICollectedFragment[]>) {}

  async getMeta(name: string): Promise<ICollectedFragment[]> {
    if (this.#collectedFragmentsByName.has(name)) return this.#collectedFragmentsByName.get(name);
    const fragments = await this.getFragments(name);
    this.#collectedFragmentsByName.set(name, fragments);
    return fragments;
  }

  async get(name: string): Promise<globalThis.DocumentFragment> {
    const fragments = await this.getMeta(name);
    if (fragments.length === 0) return null;
    return this.#domParser.parseFromString(fragments[0].outerHTML, 'text/html') as any;
  }

  async getAll(name: string): Promise<globalThis.DocumentFragment[]> {
    const fragments = await this.getMeta(name);
    if (fragments.length === 0) return null;
    return fragments.map(x => this.#domParser.parseFromString(x.outerHTML, 'text/html') as any);
  }
}
