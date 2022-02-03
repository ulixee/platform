import type {} from 'awaited-dom/base/interfaces/super';
import type {} from 'awaited-dom/base/interfaces/official';
import { awaitedPathState, extendNodeLists, extendNodes } from '@ulixee/hero/lib/DomExtender';

interface IBaseExtendNode {
  $extractLater(name: string): Promise<void>;
}

interface IBaseExtendNodeList {
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
  async $extractLater(name: string): Promise<void> {
    const { awaitedPath, awaitedOptions } = awaitedPathState.getState(this);
    const coreFrame = await awaitedOptions.coreFrame;
    await coreFrame.collectFragment(name, awaitedPath.toJSON());
  },
};

const NodeListExtensionFns: IBaseExtendNodeList = {
  async $extractLater(name: string): Promise<void> {
    const { awaitedPath, awaitedOptions } = awaitedPathState.getState(this);
    const coreFrame = await awaitedOptions.coreFrame;
    await coreFrame.collectFragment(name, awaitedPath.toJSON());
  },
};

extendNodes<IBaseExtendNode, any>(NodeExtensionFns, {});
extendNodeLists(NodeListExtensionFns);
