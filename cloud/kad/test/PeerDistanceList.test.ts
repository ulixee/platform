import { decodeBuffer, encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import { PeerDistanceList } from '../lib/PeerDistanceList';
import { nodeIdToKadId } from '../lib/Kad';

describe('PeerDistanceList', () => {
  const [p1, p2, p3, p4, p6] = [
    'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsI=', // 00
    'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsM=', // 01
    'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsY=', // 04
    'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsQ=', // 06
    'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsU=', // 07
  ].map(x => {
    return encodeBuffer(Buffer.from(x, 'base64'), Identity.encodingPrefix);
  });
  const p5 = p1.toString();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const p6_2 = p6.toString();

  let key: Buffer;
  beforeAll(async () => {
    key = decodeBuffer(p1, Identity.encodingPrefix);
    // we don't need to test the hashing here - better to have predictable distances
    jest
      .spyOn<any, any>(PeerDistanceList.prototype, 'nodeIdToKadId')
      .mockImplementation((x: string) => {
        return decodeBuffer(x, Identity.encodingPrefix);
      });
  });

  describe('basics', () => {
    it('add', async () => {
      const pdl = new PeerDistanceList(key, 100);

      await pdl.add(p3);
      await pdl.add(p1);
      await pdl.add(p2);
      await pdl.add(p4);
      await pdl.add(p5);
      await pdl.add(p1);

      // Note: p1 and p5 are equal
      expect(pdl.length).toBe(4);
      expect(pdl.peers).toEqual([p1, p2, p3, p4]);
    });

    it('capacity', async () => {
      const pdl = new PeerDistanceList(key, 3);

      await pdl.add(p1);
      await pdl.add(p4);
      await pdl.add(p5);
      await pdl.add(p6);
      await pdl.add(p3);
      await pdl.add(p2);

      // Note: p1 and p5 are equal
      expect(pdl.length).toBe(3);

      // Closer peers added later should replace further
      // peers added earlier
      expect(pdl.peers).toEqual([p1, p2, p3]);
    });
  });

  describe('closer', () => {
    let pdl: PeerDistanceList;

    beforeAll(async () => {
      pdl = new PeerDistanceList(key, 100);

      await pdl.add(p1);
      await pdl.add(p2);
      await pdl.add(p4);
      await pdl.add(p6);
    });

    it('single closer peer', async () => {
      const closer = await pdl.anyCloser([p3]);

      expect(closer).toBe(true);
    });

    it('single further peer', async () => {
      const closer = await pdl.anyCloser([p6_2]);

      expect(closer).toBe(false);
    });

    it('closer and further peer', async () => {
      const closer = await pdl.anyCloser([p3, p6_2]);

      expect(closer).toBe(true);
    });

    it('single peer equal to furthest in list', async () => {
      const closer = await pdl.anyCloser([p6_2]);

      expect(closer).toBe(false);
    });

    it('no peers', async () => {
      const closer = await pdl.anyCloser([]);

      expect(closer).toBe(false);
    });

    it('empty peer distance list', async () => {
      pdl = new PeerDistanceList(key, 100);
      const closer = await pdl.anyCloser([p1]);

      expect(closer).toBe(true);
    });

    it('empty peer distance list and no peers', async () => {
      pdl = new PeerDistanceList(key, 100);
      const closer = await pdl.anyCloser([]);

      expect(closer).toBe(false);
    });
  });
});
