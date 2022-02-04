/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
import ICollectedElement from '@ulixee/hero-interfaces/ICollectedElement';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import { DOMParser } from 'linkedom';

export default class CollectedElements {
  static #domParser = new DOMParser();

  #collectedElementsByName = new Map<string, ICollectedElement[]>();
  readonly #coreSessionPromise: Promise<ICoreSession>;
  readonly #sessionIdPromise: Promise<string>;

  constructor(coreSessionPromise: Promise<ICoreSession>, sessionIdPromise: Promise<string>) {
    this.#coreSessionPromise = coreSessionPromise;
    this.#sessionIdPromise = sessionIdPromise;
  }

  async getMeta(name: string): Promise<ICollectedElement[]> {
    if (this.#collectedElementsByName.has(name)) return this.#collectedElementsByName.get(name);
    const [coreSession, sessionId] = await Promise.all([this.#coreSessionPromise, this.#sessionIdPromise]);
    const elements = await coreSession.getCollectedElements(sessionId, name);
    this.#collectedElementsByName.set(name, elements);
    return elements;
  }

  async get(name: string): Promise<Element> {
    const collectedElements = await this.getMeta(name);
    if (collectedElements.length === 0) return null;
    return CollectedElements.parseIntoFrozenDom(collectedElements[0].outerHTML);
  }

  async getAll(name: string): Promise<Element[]> {
    const collectedElements = await this.getMeta(name);
    if (collectedElements.length === 0) return null;
    return collectedElements.map(x => CollectedElements.parseIntoFrozenDom(x.outerHTML));
  }

  public static parseIntoFrozenDom(outerHTML: string): Element {
    return this.#domParser.parseFromString(outerHTML, 'text/html').firstChild;
  }
}
