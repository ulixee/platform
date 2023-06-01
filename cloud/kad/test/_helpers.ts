import { decodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import Identity from '@ulixee/crypto/lib/Identity';

export function createNodeIds(count: number): string[] {
  return Array(count)
    .fill(0)
    .map(Identity.createSync)
    .map(x => x.bech32);
}

export function idBytes(id: string): Buffer {
  return decodeBuffer(id, Identity.encodingPrefix);
}

export function delay(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis));
}
