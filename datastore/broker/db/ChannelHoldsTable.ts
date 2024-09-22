import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class ChannelHoldsTable {
  private readonly insertQuery: Statement<IChannelHoldRecord>;
  private readonly updateSettlementQuery: Statement<{
    channelHoldId: string;
    settledMilligons: bigint;
    date: number;
  }>;

  constructor(private db: SqliteDatabase) {
    db.exec(`CREATE TABLE IF NOT EXISTS ChannelHolds (
      channelHoldId TEXT NOT NULL PRIMARY KEY,
      organizationId INTEGER NOT NULL,
      createdByIdentity TEXT NOT NULL,
      domain TEXT,
      heldMilligons INTEGER NOT NULL,
      settledMilligons INTEGER,
      settlementDate DATETIME,
      created DATETIME NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organizations(id)
    );`);
    db.exec(`CREATE INDEX IF NOT EXISTS ChannelHolds_organizationId ON ChannelHolds (organizationId);`);

    this.insertQuery = db.prepare(
      `INSERT INTO ChannelHolds (channelHoldId, organizationId, createdByIdentity, domain, heldMilligons, created) 
            VALUES (:channelHoldId, :organizationId, :createdByIdentity, :domain, :heldMilligons, :created)`,
    );
    this.updateSettlementQuery = db.prepare(
      `UPDATE ChannelHolds SET settledMilligons = :settledMilligons, settlementDate = :date WHERE channelHoldId = :channelHoldId 
            RETURNING organizationId, heldMilligons`,
    );
  }

  public create(channelHold: IChannelHoldRecord): void {
    channelHold.created = Date.now();
    this.insertQuery.run(channelHold);
  }

  public updateSettlementReturningChange(
    channelHoldId: string,
    settledMilligons: bigint,
    settlementDate: number,
  ): [organizationId: string, holdAmount: bigint, change: bigint] {
    const { organizationId, heldMilligons } = this.updateSettlementQuery.get({
      channelHoldId,
      settledMilligons,
      date: settlementDate,
    }) as { organizationId: string; heldMilligons: bigint };
    const change = heldMilligons - settledMilligons;
    return [organizationId, heldMilligons, change];
  }

  /// ADMIN APIS
  public count(): number {
    return (
      (this.db
        .prepare(`SELECT COUNT(*) FROM ChannelHolds`)
        .safeIntegers(false)
        .pluck()
        .get() as number) ?? 0
    );
  }

  public countOpen(): number {
    return (
      (this.db
        .prepare(`SELECT COUNT(*) FROM ChannelHolds WHERE settlementDate IS NULL`)
        .safeIntegers(false)
        .pluck()
        .get() as number) ?? 0
    );
  }

  public pendingBalance(): bigint {
    return (
      (this.db
        .prepare(`SELECT SUM(heldMilligons) FROM ChannelHolds WHERE settlementDate IS NULL`)
        .pluck()
        .get() as bigint) ?? 0n
    );
  }
}

export interface IChannelHoldRecord {
  channelHoldId: string;
  organizationId: string;
  createdByIdentity: string;
  domain?: string;
  heldMilligons: bigint;
  settledMilligons?: bigint;
  settlementDate?: number;
  created: number;
}
