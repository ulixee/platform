/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
import ICollectedElement from '@ulixee/hero-interfaces/ICollectedElement';
import { DOMParser } from 'linkedom';

export default class CollectedElements {
  #domParser = new DOMParser();
  #collectedElementsByName = new Map<string, ICollectedElement[]>();
  constructor(private readonly getElements: (name: string) => Promise<ICollectedElement[]>) {}

  async getMeta(name: string): Promise<ICollectedElement[]> {
    if (this.#collectedElementsByName.has(name)) return this.#collectedElementsByName.get(name);
    const elements = await this.getElements(name);
    this.#collectedElementsByName.set(name, elements);
    return elements;
  }

  async get(name: string): Promise<Element> {
    const elements = await this.getMeta(name);
    if (elements.length === 0) return null;
    return this.#domParser.parseFromString(elements[0].outerHTML, 'text/html').firstChild;
  }

  async getAll(name: string): Promise<Element[]> {
    const elements = await this.getMeta(name);
    if (elements.length === 0) return null;
    return elements.map(x => this.#domParser.parseFromString(x.outerHTML, 'text/html').firstChild);
  }
}