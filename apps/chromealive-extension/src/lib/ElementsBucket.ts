import { MessageEventType } from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import { sendToCore, sendToDevtoolsPrivate, sendToDevtoolsScript } from './content/ContentMessenger';

interface IResolvable<T = any> {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

const elementPromisesById: { [id: string]: IResolvable<HTMLElement> } = {};

export default class ElementsBucket {
  private includedElementsById: Map<number, HTMLElement> = new Map();
  private excludedElementsById: Map<number, HTMLElement> = new Map();

  public get includedElements(): HTMLElement[] {
    return Array.from(this.includedElementsById.values());
  }

  public async getByBackendNodeId(backendNodeId: number): Promise<HTMLElement> {
    // @ts-ignore
    const callbackFnName = window.onElementFromCore.name;
    const promise = new Promise<HTMLElement>((resolve, reject) => {
      elementPromisesById[backendNodeId] = { resolve, reject };
      sendToCore({ event: MessageEventType.ContentScriptNeedsElement, backendNodeId, callbackFnName });
    });
    const element = await promise;
    delete elementPromisesById[backendNodeId];
    return element;
  }

  public reset() {
    this.includedElementsById = new Map();
    this.excludedElementsById = new Map();
  }

  public isIncludedBackendNodeId(backendNodeId: number): boolean {
    return this.includedElementsById.has(backendNodeId);
  }

  public addIncludedElement(backendNodeId: number, element: HTMLElement): void {
    const tagText = extractTagText(element);
    this.includedElementsById.set(backendNodeId, element);
    this.removeExcludedElement(backendNodeId);

    const payload = { event: MessageEventType.AddIncludedElement, name: tagText, backendNodeId };
    sendToDevtoolsScript(payload);
    sendToDevtoolsPrivate(payload);
  }

  public removeIncludedElement(backendNodeId: number): void {
    this.includedElementsById.delete(backendNodeId);

    const payload = { event: MessageEventType.RemoveIncludedElement, backendNodeId };
    sendToDevtoolsScript(payload);
    sendToDevtoolsPrivate(payload);
  }

  public isExcludedBackendNodeId(backendNodeId: number): boolean {
    return this.excludedElementsById.has(backendNodeId);
  }

  public addExcludedElement(backendNodeId: number, element: HTMLElement): void {
    const tagText = extractTagText(element);
    this.excludedElementsById.set(backendNodeId, element);
    this.removeIncludedElement(backendNodeId);

    const payload = { event: MessageEventType.AddExcludedElement, backendNodeId, name: tagText }
    sendToDevtoolsScript(payload);
    sendToDevtoolsPrivate(payload);
  }

  public removeExcludedElement(backendNodeId: number): void {
    this.excludedElementsById.delete(backendNodeId);

    const payload = { event: MessageEventType.RemoveExcludedElement, backendNodeId };
    sendToDevtoolsScript(payload);
    sendToDevtoolsPrivate(payload);
  }

  public getByKey(backendNodeId: number): HTMLElement {
    return this.includedElementsById.get(backendNodeId) || this.excludedElementsById.get(backendNodeId);
  }
}

function extractTagText(element: HTMLElement): string {
  const outerHtml = element.outerHTML;
  const len = outerHtml.length;

  const openTagLength = outerHtml[len - 2] === '/' ? // Is self-closing tag?
    len :
    len - element.innerHTML.length - (element.tagName.length + 3);

  return outerHtml.slice(0, openTagLength);
}

// @ts-ignore
window.onElementFromCore = function onElementFromCore(backendNodeId: number, element: HTMLElement) {
  if (!elementPromisesById[backendNodeId]) return;
  elementPromisesById[backendNodeId].resolve(element);
  delete elementPromisesById[backendNodeId];
}
