import Database = require('better-sqlite3');
import { IPayment } from '@ulixee/platform-specification';
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import * as Fs from 'fs';
import env from '../env';

export default class DatastoreEscrowsDb {
  private db: SqliteDatabase;
  private readonly insertStatement: Statement<{
    id: string;
    microgons: number;
    expirationDate: number;
  }>;

  private readonly getStatement: Statement<{ id: string }>;
  private readonly debitStatement: Statement<{
    id: string;
    microgons: number;
    settledMilligons: bigint;
    now: number;
  }>;

  private readonly finalizeStatement: Statement<{ id: string; microgons: number }>;

  private readonly path: string;

  private readonly paymentIdByEscrowId = new Map<
    string,
    Map<string, { microgons: number; queryId: string }>
  >();

  private interval: NodeJS.Timeout;

  constructor(
    baseDir: string,
    public datastoreId: string,
  ) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.path = `${baseDir}/escrows-${datastoreId}.db`;
    this.db = new Database(this.path);
    if (env.enableSqliteWalMode) {
      this.db.unsafeMode(false);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
    }
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS escrows (
      id TEXT NOT NULL PRIMARY KEY,
      allocated INTEGER,
      remaining INTEGER,
      expirationDate DATETIME,
      CHECK (remaining <= allocated),
      CHECK (remaining >= 0)
    );
    `);
    this.insertStatement = this.db.prepare(
      'INSERT INTO escrows (id, allocated, remaining, expirationDate) VALUES (:id, :microgons, :microgons, :expirationDate)',
    );
    this.getStatement = this.db.prepare('SELECT * FROM escrows WHERE id = :id LIMIT 1');
    this.debitStatement = this.db.prepare(`UPDATE escrows 
        SET remaining = remaining - :microgons
      WHERE id = :id
        AND remaining - :microgons >= 0 
        AND expirationDate >= :now
        AND CEIL((allocated - remaining + :microgons) / 1000) <= :settledMilligons`);
    this.finalizeStatement = this.db.prepare(`UPDATE escrows
      SET remaining = remaining + :microgons
      WHERE id = :id
      AND remaining + :microgons <= allocated`);

    this.interval = setInterval(this.cleanup.bind(this), 60e3).unref();
  }

  create(id: string, allocatedMilligons: number, expirationDate: Date): IEscrowRecord {
    const microgons = allocatedMilligons * 1000;
    const result = this.insertStatement.run({
      id,
      microgons,
      expirationDate: expirationDate.getTime(),
    });
    if (!result.changes || result.changes < 1) throw new Error('Could not create the escrow.');
    return {
      id,
      allocated: microgons,
      remaining: microgons,
      expirationDate,
    };
  }

  list(): IEscrowRecord[] {
    return this.db
      .prepare('SELECT * FROM escrows')
      .all()
      .map((x: IEscrowRecord) => {
        x.expirationDate = new Date(x.expirationDate);
        return x;
      });
  }

  get(id: string): IEscrowRecord {
    const record = this.getStatement.get({ id }) as IEscrowRecord;
    if (!record) throw new Error('No PaymentChannelEscrow found');
    record.expirationDate = new Date(record.expirationDate);
    return record;
  }

  debit(queryId: string, payment: IPayment): { shouldFinalize: boolean } {
    const escrowId = payment.escrow?.id;
    if (!escrowId) throw new Error('No escrow payment provided. Internal code issue.');
    if (!this.paymentIdByEscrowId.has(escrowId)) {
      this.paymentIdByEscrowId.set(escrowId, new Map());
    }
    const existing = this.paymentIdByEscrowId.get(escrowId).get(payment.uuid);
    if (existing) {
      if (queryId.startsWith(existing.queryId))
        return {
          shouldFinalize: false,
        };
      throw new Error('This payment has already been debited.');
    }

    this.paymentIdByEscrowId
      .get(escrowId)
      .set(payment.uuid, { microgons: payment.microgons, queryId });

    const result = this.debitStatement.run({
      id: escrowId,
      microgons: payment.microgons,
      settledMilligons: payment.escrow.settledMilligons,
      now: Date.now(),
    });
    if (!result.changes || result.changes < 1) {
      const escrow = this.get(escrowId);
      if (escrow.expirationDate < new Date()) {
        throw new Error('This escrow has expired.');
      }
      if (escrow.remaining < payment.microgons) {
        throw new Error('This escrow does not have enough remaining funds.');
      }
      if (
        Math.ceil((escrow.allocated - escrow.remaining + payment.microgons) / 1000) >
        Number(payment.escrow.settledMilligons)
      ) {
        throw new Error(
          `This escrow needs a larger settlement to debit. Current settledMilligons=${payment.escrow.settledMilligons}, New spentMicrogons=${escrow.allocated - escrow.remaining + payment.microgons} (ceiling to nearest milligon)`,
        );
      }
      throw new Error('Could not debit the escrow.');
    }
    return { shouldFinalize: true };
  }

  finalize(escrowId: string, uuid: string, finalMicrogons: number): void {
    const entry = this.paymentIdByEscrowId.get(escrowId)?.get(uuid);
    if (!entry) throw new Error('Could not find the initial payment for the given Escrow.');
    if (finalMicrogons < 0) throw new Error('Final payment cannot be negative.');

    const adjustment = entry.microgons - finalMicrogons;
    if (adjustment === 0) {
      return;
    }
    const result = this.finalizeStatement.run({ id: escrowId, microgons: adjustment });
    if (!result.changes || result.changes < 1) {
      throw new Error('Could not finalize the payment.');
    }
  }

  cleanup(cleanWithExpiredMillis = 60 * 60e3): void {
    // remove anything older than an hour
    const toDelete = this.db
      .prepare(`SELECT id FROM escrows WHERE expirationDate < ?`)
      .pluck()
      .all(Date.now() - cleanWithExpiredMillis) as string[];
    if (!toDelete.length) return;

    this.db
      .prepare(`DELETE FROM escrows WHERE id IN (${toDelete.map(() => '?').join(',')})`)
      .run(...toDelete);
    this.db.pragma('optimize');
    for (const id of toDelete) {
      this.paymentIdByEscrowId.delete(id);
    }
  }

  close(): void {
    clearInterval(this.interval);
    this.interval = null;
    if (this.db?.open) {
      this.cleanup();
      this.db?.close();
    }
    this.db = null;
  }
}

export interface IEscrowRecord {
  id: string;
  allocated: number;
  remaining: number;
  expirationDate: Date;
}
