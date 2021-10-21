import { nanoid } from 'nanoid';

export default class ElementsBucket {
  private includedElementsByKey: Map<string, Element> = new Map();
  private includedKeysByElement: Map<Element, string> = new Map();

  private excludedElementsByKey: Map<string, Element> = new Map();
  private excludedKeysByElement: Map<Element, string> = new Map();

  public get includedElements(): Element[] {
    return Array.from(this.includedElementsByKey.values());
  }

  public reset() {
    this.includedElementsByKey = new Map();
    this.includedKeysByElement = new Map();
    this.excludedElementsByKey = new Map();
    this.excludedKeysByElement = new Map();
  }

  isIncludedElement(element: Element): boolean {
    return this.includedKeysByElement.has(element);
  }

  addIncludedElement(element: Element): string {
    const key = nanoid();
    this.includedElementsByKey.set(key, element);
    this.includedKeysByElement.set(element, key);
    return key;
  }

  removeIncludedElement(element: Element): string {
    const key = this.includedKeysByElement.get(element);
    this.includedElementsByKey.delete(key);
    this.includedKeysByElement.delete(element);
    return key;
  }

  isExcludedElement(element: Element): boolean {
    return this.excludedKeysByElement.has(element);
  }

  addExcludedElement(element: Element): string {
    const key = nanoid();
    this.excludedElementsByKey.set(key, element);
    this.excludedKeysByElement.set(element, key);
    return key;
  }

  removeExcludedElement(element: Element): string {
    const key = this.excludedKeysByElement.get(element);
    this.excludedElementsByKey.delete(key);
    this.excludedKeysByElement.delete(element);
    return key;
  }

}
