import { Resource, WebsocketResource } from '@ulixee/hero';
import { InternalPropertiesSymbol } from '@ulixee/hero/lib/InternalProperties';
import type {} from '@ulixee/hero/lib/extendables';

interface IExtendResource {
  $extractLater(name: string): Promise<void>;
}

interface IExtendWebsocketResource {
  $extractLater(name: string): Promise<void>;
}

declare module '@ulixee/hero/lib/extendables' {
  interface Resource extends IExtendResource {}
  interface WebsocketResource extends IExtendWebsocketResource {}
}

const ResourceExtensionFns: IExtendResource = {
  $extractLater(name: string): Promise<void> {
    const internalState = this[InternalPropertiesSymbol];
    const id = internalState.resourceMeta.id;
    const coreTabPromise = internalState.coreTabPromise;
    return coreTabPromise.then(x => x.collectResource(name, id));
  },
}

for (const Item of [Resource, WebsocketResource]) {
  for (const [key, value] of Object.entries(ResourceExtensionFns)) {
    void Object.defineProperty(Item.prototype, key, {
      enumerable: false,
      configurable: false,
      writable: false,
      value,
    });
  }
}
