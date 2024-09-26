import Database = require('better-sqlite3');
import { IPayment } from '@ulixee/platform-specification';
import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import * as Fs from 'fs';
import env from '../env';

export default class DatastoreChannelHoldsDb {
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

  private readonly paymentIdByChannelHoldId = new Map<
    string,
    Map<string, { microgons: number; queryId: string }>
  >();

  private interval: NodeJS.Timeout;

  constructor(
    baseDir: string,
    public datastoreId: string,
  ) {
    if (!Fs.existsSync(baseDir)) Fs.mkdirSync(baseDir, { recursive: true });
    this.path = `${baseDir}/channel-holds-${datastoreId}.db`;
    this.db = new Database(this.path);
    if (env.enableSqliteWalMode) {
      this.db.unsafeMode(false);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
    }
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS channelHolds (
      id TEXT NOT NULL PRIMARY KEY,
      allocated INTEGER,
      remaining INTEGER,
      expirationDate DATETIME,
      CHECK (remaining <= allocated),
      CHECK (remaining >= 0)
    );
    `);
    this.insertStatement = this.db.prepare(
      'INSERT INTO channelHolds (id, allocated, remaining, expirationDate) VALUES (:id, :microgons, :microgons, :expirationDate)',
    );
    this.getStatement = this.db.prepare('SELECT * FROM channelHolds WHERE id = :id LIMIT 1');
    this.debitStatement = this.db.prepare(`UPDATE channelHolds 
        SET remaining = remaining - :microgons
      WHERE id = :id
        AND remaining - :microgons >= 0 
        AND expirationDate >= :now
        AND CEIL((allocated - remaining + :microgons) / 1000) <= :settledMilligons`);
    this.finalizeStatement = this.db.prepare(`UPDATE channelHolds
      SET remaining = remaining + :microgons
      WHERE id = :id
      AND remaining + :microgons <= allocated`);

    this.interval = setInterval(this.cleanup.bind(this), 60e3).unref();
  }

  create(id: string, allocatedMilligons: number, expirationDate: Date): IChannelHoldRecord {
    const microgons = allocatedMilligons * 1000;
    const result = this.insertStatement.run({
      id,
      microgons,
      expirationDate: expirationDate.getTime(),
    });
    if (!result.changes || result.changes < 1) throw new Error('Could not create the channelHold.');
    return {
      id,
      allocated: microgons,
      remaining: microgons,
      expirationDate,
    };
  }

  list(): IChannelHoldRecord[] {
    return this.db
      .prepare('SELECT * FROM channelHolds')
      .all()
      .map((x: IChannelHoldRecord) => {
        x.expirationDate = new Date(x.expirationDate);
        return x;
      });
  }

  get(id: string): IChannelHoldRecord {
    const record = this.getStatement.get({ id }) as IChannelHoldRecord;
    if (!record) throw new Error('No PaymentChannelChannelHold found');
    record.expirationDate = new Date(record.expirationDate);
    return record;
  }

  debit(queryId: string, payment: IPayment): { shouldFinalize: boolean } {
    const channelHoldId = payment.channelHold?.id;
    if (!channelHoldId) throw new Error('No channel hold id provided. Internal code issue.');
    if (!this.paymentIdByChannelHoldId.has(channelHoldId)) {
      this.paymentIdByChannelHoldId.set(channelHoldId, new Map());
    }
    const existing = this.paymentIdByChannelHoldId.get(channelHoldId).get(payment.uuid);
    if (existing) {
      if (queryId.startsWith(existing.queryId))
        return {
          shouldFinalize: false,
        };
      throw new Error('This payment has already been debited.');
    }

    this.paymentIdByChannelHoldId
      .get(channelHoldId)
      .set(payment.uuid, { microgons: payment.microgons, queryId });

    const result = this.debitStatement.run({
      id: channelHoldId,
      microgons: payment.microgons,
      settledMilligons: payment.channelHold.settledMilligons,
      now: Date.now(),
    });
    if (!result.changes || result.changes < 1) {
      const channelHold = this.get(channelHoldId);
      if (channelHold.expirationDate < new Date()) {
        throw new Error('This channelHold has expired.');
      }
      if (channelHold.remaining < payment.microgons) {
        throw new Error('This channelHold does not have enough remaining funds.');
      }
      if (
        Math.ceil((channelHold.allocated - channelHold.remaining + payment.microgons) / 1000) >
        Number(payment.channelHold.settledMilligons)
      ) {
        throw new Error(
          `This channelHold needs a larger settlement to debit. Current settledMilligons=${payment.channelHold.settledMilligons}, New spentMicrogons=${channelHold.allocated - channelHold.remaining + payment.microgons} (ceiling to nearest milligon)`,
        );
      }
      throw new Error('Could not debit the channelHold.');
    }
    return { shouldFinalize: true };
  }

  finalize(channelHoldId: string, uuid: string, finalMicrogons: number): void {
    const entry = this.paymentIdByChannelHoldId.get(channelHoldId)?.get(uuid);
    if (!entry) throw new Error('Could not find the initial payment for the given ChannelHold.');
    if (finalMicrogons < 0) throw new Error('Final payment cannot be negative.');

    const adjustment = entry.microgons - finalMicrogons;
    if (adjustment === 0) {
      return;
    }
    const result = this.finalizeStatement.run({ id: channelHoldId, microgons: adjustment });
    if (!result.changes || result.changes < 1) {
      throw new Error('Could not finalize the payment.');
    }
  }

  cleanup(cleanWithExpiredMillis = 60 * 60e3): void {
    // remove anything older than an hour
    const toDelete = this.db
      .prepare(`SELECT id FROM channelHolds WHERE expirationDate < ?`)
      .pluck()
      .all(Date.now() - cleanWithExpiredMillis) as string[];
    if (!toDelete.length) return;

    this.db
      .prepare(`DELETE FROM channelHolds WHERE id IN (${toDelete.map(() => '?').join(',')})`)
      .run(...toDelete);
    this.db.pragma('optimize');
    for (const id of toDelete) {
      this.paymentIdByChannelHoldId.delete(id);
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

export interface IChannelHoldRecord {
  id: string;
  allocated: number;
  remaining: number;
  expirationDate: Date;
}
