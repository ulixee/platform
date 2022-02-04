import {
  ISuperElement,
  ISuperHTMLCollection,
  ISuperHTMLElement,
  ISuperNode,
  ISuperNodeList,
} from 'awaited-dom/base/interfaces/super';
import {
  IElement,
  IHTMLCollection,
  IHTMLElement,
  INode,
  INodeList,
} from 'awaited-dom/base/interfaces/official';
import { awaitedPathState, extendNodeLists, extendNodes } from '@ulixee/hero/lib/DomExtender';
import { IExtractElementFn, IExtractElementOptions, IExtractElementsFn } from '../interfaces/IComponents';
import { getDataboxInternalByCoreSession } from './DataboxInternal';
import CollectedElements from './CollectedElements';

interface IBaseExtendNode {
  $extract<T = any>(extractFn: IExtractElementFn<T>, options?: IExtractElementOptions): Promise<T>;
  $extractLater(name: string): Promise<void>;
}

interface IBaseExtendNodeList {
  $extract<T = any>(extractFn: IExtractElementsFn<T>, options?: IExtractElementOptions): Promise<T>;
  $extractLater(name: string): Promise<void>;
}

declare module 'awaited-dom/base/interfaces/super' {
  interface ISuperElement extends IBaseExtendNode {}
  interface ISuperNode extends IBaseExtendNode {}
  interface ISuperHTMLElement extends IBaseExtendNode {}
  interface ISuperNodeList extends IBaseExtendNodeList {}
  interface ISuperHTMLCollection extends IBaseExtendNodeList {}
}

declare module 'awaited-dom/base/interfaces/official' {
  interface IElement extends IBaseExtendNode {}
  interface INode extends IBaseExtendNode {}
  interface IHTMLElement extends IBaseExtendNode {}
  interface INodeList extends IBaseExtendNodeList {}
  interface IHTMLCollection extends IBaseExtendNodeList {}
}

const NodeExtensionFns: Omit<IBaseExtendNode, ''> = {
  async $extract<T = any>(extractFn: IExtractElementFn<T>, options: IExtractElementOptions = {}): Promise<T> {
    const { awaitedPath, awaitedOptions } = awaitedPathState.getState(this);
    const coreFrame = await awaitedOptions.coreFrame;
    const collectedElements = await coreFrame.collectElement(options.name, awaitedPath.toJSON(), true);
    const frozenElement = CollectedElements.parseIntoFrozenDom(collectedElements[0].outerHTML);
    const coreSession = coreFrame.coreTab.coreSession;
    const databoxInternal = getDataboxInternalByCoreSession(coreSession);
    const response = databoxInternal.execExtractor(extractFn, frozenElement);
    return response as unknown as T;
  },
  async $extractLater(name: string): Promise<void> {
    const { awaitedPath, awaitedOptions } = awaitedPathState.getState(this);
    const coreFrame = await awaitedOptions.coreFrame;
    await coreFrame.collectElement(name, awaitedPath.toJSON());
  },
};

const NodeListExtensionFns: IBaseExtendNodeList = {
  async $extract<T = any>(extractFn: IExtractElementsFn<T>, options: IExtractElementOptions = {}): Promise<T> {
    const { awaitedPath, awaitedOptions } = awaitedPathState.getState(this);
    const coreFrame = await awaitedOptions.coreFrame;
    const collectedElements = await coreFrame.collectElement(options.name, awaitedPath.toJSON(), true);
    const frozenElements = collectedElements.map(x => CollectedElements.parseIntoFrozenDom(x.outerHTML));
    const coreSession = coreFrame.coreTab.coreSession;
    const databoxInternal = getDataboxInternalByCoreSession(coreSession);
    const response = databoxInternal.execExtractor(extractFn, frozenElements);
    return response as unknown as T;
  },
  async $extractLater(name: string): Promise<void> {
    const { awaitedPath, awaitedOptions } = awaitedPathState.getState(this);
    const coreFrame = await awaitedOptions.coreFrame;
    await coreFrame.collectElement(name, awaitedPath.toJSON());
  },
};

extendNodes<IBaseExtendNode, any>(NodeExtensionFns, {});
extendNodeLists(NodeListExtensionFns);
export {
  ISuperElement,
  ISuperNode,
  ISuperHTMLElement,
  ISuperNodeList,
  ISuperHTMLCollection,
  IElement,
  INode,
  IHTMLElement,
  INodeList,
  IHTMLCollection,
};
