"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bufferUtils_1 = require("@ulixee/commons/lib/bufferUtils");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const PeerDistanceList_1 = require("../lib/PeerDistanceList");
describe('PeerDistanceList', () => {
    const [p1, p2, p3, p4, p6] = [
        'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsI=',
        'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsM=',
        'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsY=',
        'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsQ=',
        'ACQIARIg9AguWHv1omDmilVY2z2v/beDBmaCIKiTmOZpdtwUqsU=', // 07
    ].map(x => {
        return (0, bufferUtils_1.encodeBuffer)(Buffer.from(x, 'base64'), Identity_1.default.encodingPrefix);
    });
    const p5 = p1.toString();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const p6_2 = p6.toString();
    let key;
    beforeAll(async () => {
        key = (0, bufferUtils_1.decodeBuffer)(p1, Identity_1.default.encodingPrefix);
        // we don't need to test the hashing here - better to have predictable distances
        jest
            .spyOn(PeerDistanceList_1.PeerDistanceList.prototype, 'nodeIdToKadId')
            .mockImplementation((x) => {
            return (0, bufferUtils_1.decodeBuffer)(x, Identity_1.default.encodingPrefix);
        });
    });
    describe('basics', () => {
        it('add', async () => {
            const pdl = new PeerDistanceList_1.PeerDistanceList(key, 100);
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
            const pdl = new PeerDistanceList_1.PeerDistanceList(key, 3);
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
        let pdl;
        beforeAll(async () => {
            pdl = new PeerDistanceList_1.PeerDistanceList(key, 100);
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
            pdl = new PeerDistanceList_1.PeerDistanceList(key, 100);
            const closer = await pdl.anyCloser([p1]);
            expect(closer).toBe(true);
        });
        it('empty peer distance list and no peers', async () => {
            pdl = new PeerDistanceList_1.PeerDistanceList(key, 100);
            const closer = await pdl.anyCloser([]);
            expect(closer).toBe(false);
        });
    });
});
//# sourceMappingURL=PeerDistanceList.test.js.map