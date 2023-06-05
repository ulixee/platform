import { decodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import Identity from '@ulixee/crypto/lib/Identity';

export function createNodeIds(count: number): string[] {
  return Array(count)
    .fill(0)
    .map(Identity.createSync)
    .map(x => x.bech32);
}

export function nodeIdToKadId(id: string): Buffer {
  return sha256(decodeBuffer(id, Identity.encodingPrefix));
}

export function delay(millis: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, millis));
}
