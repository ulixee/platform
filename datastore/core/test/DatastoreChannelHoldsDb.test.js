"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashUtils_1 = require("@ulixee/commons/lib/hashUtils");
const Path = require("node:path");
const datastore_testing_1 = require("@ulixee/datastore-testing");
const DatastoreChannelHoldsDb_1 = require("../db/DatastoreChannelHoldsDb");
const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreChannelHoldsDb.test');
const db = new DatastoreChannelHoldsDb_1.default(storageDir, 'test1');
afterEach(datastore_testing_1.Helpers.afterEach);
afterAll(async () => {
    await datastore_testing_1.Helpers.afterAll();
    db.close();
});
test('handles the flow of a payment', async () => {
    db.create('test1', 1000, new Date(Date.now() + 1000));
    expect(db.list()).toHaveLength(1);
    expect(db.get('test1')).toEqual({
        id: 'test1',
        allocated: 1000 * 1000,
        remaining: 1000 * 1000,
        expirationDate: expect.any(Date),
    });
    const result = db.debit('q1', {
        uuid: 'p1',
        microgons: 100,
        channelHold: { id: 'test1', settledMilligons: 1n, settledSignature: Buffer.from((0, hashUtils_1.sha256)('123')) },
    });
    expect(result.shouldFinalize).toBe(true);
    // @ts-expect-error
    const payments = db.paymentIdByChannelHoldId;
    expect(payments.size).toBe(1);
    expect(payments.get('test1').size).toBe(1);
    expect(payments.get('test1').get('p1')).toEqual({ microgons: 100, queryId: 'q1' });
    db.finalize('test1', 'p1', 100);
    expect(payments.get('test1').get('p1')).toEqual({ microgons: 100, queryId: 'q1' });
});
test('rejects payments on expired channelHolds', async () => {
    db.create('test2', 1000, new Date(Date.now() - 1));
    expect(() => {
        db.debit('q2', {
            uuid: 'p2',
            microgons: 100,
            channelHold: { id: 'test2', settledMilligons: 1n, settledSignature: Buffer.from((0, hashUtils_1.sha256)('123')) },
        });
    }).toThrow('This channelHold has expired.');
    expect(db.list()).toHaveLength(2);
    db.cleanup(1);
    expect(db.list()).toHaveLength(1);
});
test('rejects a payment with too small a settlement signature', async () => {
    db.create('test3', 5000, new Date(Date.now() + 100000));
    expect(() => {
        db.debit('q3', {
            uuid: 'p3',
            microgons: 2000,
            channelHold: { id: 'test3', settledMilligons: 1n, settledSignature: Buffer.from((0, hashUtils_1.sha256)('123')) },
        });
    }).toThrow(/settlement/);
});
test('rejects a payment with too small a settlement signature within a milligon', async () => {
    db.create('test4', 5, new Date(Date.now() + 100000));
    db.debit('q4', {
        uuid: 'p4',
        microgons: 1900,
        channelHold: { id: 'test4', settledMilligons: 2n, settledSignature: Buffer.from((0, hashUtils_1.sha256)('123')) },
    });
    db.debit('q6', {
        uuid: 'p6',
        microgons: 99,
        channelHold: { id: 'test4', settledMilligons: 2n, settledSignature: Buffer.from((0, hashUtils_1.sha256)('123')) },
    });
    expect(() => {
        db.debit('q7', {
            uuid: 'p7',
            microgons: 2,
            channelHold: { id: 'test4', settledMilligons: 2n, settledSignature: Buffer.from((0, hashUtils_1.sha256)('123')) },
        });
    }).toThrow('settlement');
});
//# sourceMappingURL=DatastoreChannelHoldsDb.test.js.map