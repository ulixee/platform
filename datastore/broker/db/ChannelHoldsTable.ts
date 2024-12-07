import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class ChannelHoldsTable {
  private readonly insertQuery: Statement<IChannelHoldRecord>;
  private readonly updateSettlementQuery: Statement<{
    channelHoldId: string;
    settledMicrogons: bigint;
    date: number;
  }>;

  constructor(private db: SqliteDatabase) {
    db.exec(`CREATE TABLE IF NOT EXISTS ChannelHolds (
      channelHoldId TEXT NOT NULL PRIMARY KEY,
      organizationId INTEGER NOT NULL,
      createdByIdentity TEXT NOT NULL,
      domain TEXT,
      heldMicrogons INTEGER NOT NULL,
      settledMicrogons INTEGER,
      settlementDate DATETIME,
      created DATETIME NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organizations(id)
    );`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS ChannelHolds_organizationId ON ChannelHolds (organizationId);`,
    );

    this.insertQuery = db.prepare(
      `INSERT INTO ChannelHolds (channelHoldId, organizationId, createdByIdentity, domain, heldMicrogons, created) 
            VALUES (:channelHoldId, :organizationId, :createdByIdentity, :domain, :heldMicrogons, :created)`,
    );
    this.updateSettlementQuery = db.prepare(
      `UPDATE ChannelHolds SET settledMicrogons = :settledMicrogons, settlementDate = :date WHERE channelHoldId = :channelHoldId 
            RETURNING organizationId, heldMicrogons`,
    );
  }

  public create(channelHold: IChannelHoldRecord): void {
    channelHold.created = Date.now();
    this.insertQuery.run(channelHold);
  }

  public updateSettlementReturningChange(
    channelHoldId: string,
    settledMicrogons: bigint,
    settlementDate: number,
  ): [organizationId: string, holdAmount: bigint, change: bigint] {
    const { organizationId, heldMicrogons } = this.updateSettlementQuery.get({
      channelHoldId,
      settledMicrogons,
      date: settlementDate,
    }) as { organizationId: string; heldMicrogons: bigint };
    const change = heldMicrogons - settledMicrogons;
    return [organizationId, heldMicrogons, change];
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
        .prepare(`SELECT SUM(heldMicrogons) FROM ChannelHolds WHERE settlementDate IS NULL`)
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
  heldMicrogons: bigint;
  settledMicrogons?: bigint;
  settlementDate?: number;
  created: number;
}
