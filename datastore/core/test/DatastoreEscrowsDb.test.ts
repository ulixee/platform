import { sha256 } from '@ulixee/commons/lib/hashUtils';
import * as Path from 'node:path';
import { Helpers } from '@ulixee/datastore-testing';
import DatastoreEscrowsDb from '../db/DatastoreEscrowsDb';

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'DatastoreEscrowsDb.test');

const db = new DatastoreEscrowsDb(storageDir, 'test1');

afterEach(Helpers.afterEach);
afterAll(async () => {
  await Helpers.afterAll();
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
    escrow: { id: 'test1', settledMilligons: 1n, settledSignature: Buffer.from(sha256('123')) },
  });
  expect(result.shouldFinalize).toBe(true);
  // @ts-expect-error
  const payments = db.paymentIdByEscrowId;
  expect(payments.size).toBe(1);
  expect(payments.get('test1').size).toBe(1);
  expect(payments.get('test1').get('p1')).toEqual({ microgons: 100, queryId: 'q1' });

  db.finalize('test1', 'p1', 100);
  expect(payments.get('test1').get('p1')).toEqual({ microgons: 100, queryId: 'q1' });
});

test('rejects payments on expired escrows', async () => {
  db.create('test2', 1000, new Date(Date.now() - 1));

  expect(() => {
    db.debit('q2', {
      uuid: 'p2',
      microgons: 100,
      escrow: { id: 'test2', settledMilligons: 1n, settledSignature: Buffer.from(sha256('123')) },
    });
  }).toThrow('This escrow has expired.');
  expect(db.list()).toHaveLength(2);
  db.cleanup(1);
  expect(db.list()).toHaveLength(1);
});

test('rejects a payment with too small a settlement signature', async () => {
  db.create('test3', 5000, new Date(Date.now() + 100_000));

  expect(() => {
    db.debit('q3', {
      uuid: 'p3',
      microgons: 2000,
      escrow: { id: 'test3', settledMilligons: 1n, settledSignature: Buffer.from(sha256('123')) },
    });
  }).toThrow(/settlement/);
});

test('rejects a payment with too small a settlement signature within a milligon', async () => {
  db.create('test4', 5, new Date(Date.now() + 100_000));
  db.debit('q4', {
    uuid: 'p4',
    microgons: 1900,
    escrow: { id: 'test4', settledMilligons: 2n, settledSignature: Buffer.from(sha256('123')) },
  });

  db.debit('q6', {
    uuid: 'p6',
    microgons: 99,
    escrow: { id: 'test4', settledMilligons: 2n, settledSignature: Buffer.from(sha256('123')) },
  });
  expect(() => {
    db.debit('q7', {
      uuid: 'p7',
      microgons: 2,
      escrow: { id: 'test4', settledMilligons: 2n, settledSignature: Buffer.from(sha256('123')) },
    });
  }).toThrow('settlement');
});
