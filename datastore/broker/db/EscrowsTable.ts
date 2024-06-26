import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class EscrowsTable {
  private readonly insertQuery: Statement<IEscrowRecord>;
  private readonly updateSettlementQuery: Statement<{
    escrowId: string;
    settledMilligons: bigint;
    date: number;
  }>;

  constructor(private db: SqliteDatabase) {
    db.exec(`CREATE TABLE IF NOT EXISTS Escrows (
      escrowId TEXT NOT NULL PRIMARY KEY,
      organizationId INTEGER NOT NULL,
      createdByIdentity TEXT NOT NULL,
      dataDomain TEXT,
      heldMilligons INTEGER NOT NULL,
      settledMilligons INTEGER,
      settlementDate DATETIME,
      created DATETIME NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organizations(id)
    );`);
    db.exec(`CREATE INDEX IF NOT EXISTS Escrows_organizationId ON Escrows (organizationId);`);

    this.insertQuery = db.prepare(
      `INSERT INTO Escrows (escrowId, organizationId, createdByIdentity, dataDomain, heldMilligons, created) 
            VALUES (:escrowId, :organizationId, :createdByIdentity, :dataDomain, :heldMilligons, :created)`,
    );
    this.updateSettlementQuery = db.prepare(
      `UPDATE Escrows SET settledMilligons = :settledMilligons, settlementDate = :date WHERE escrowId = :escrowId 
            RETURNING organizationId, heldMilligons`,
    );
  }

  public create(escrow: IEscrowRecord): void {
    escrow.created = Date.now();
    this.insertQuery.run(escrow);
  }

  public updateSettlementReturningChange(
    escrowId: string,
    settledMilligons: bigint,
    settlementDate: number,
  ): [organizationId: string, holdAmount: bigint, change: bigint] {
    const { organizationId, heldMilligons } = this.updateSettlementQuery.get({
      escrowId,
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
        .prepare(`SELECT COUNT(*) FROM Escrows`)
        .safeIntegers(false)
        .pluck()
        .get() as number) ?? 0
    );
  }

  public countOpen(): number {
    return (
      (this.db
        .prepare(`SELECT COUNT(*) FROM Escrows WHERE settlementDate IS NULL`)
        .safeIntegers(false)
        .pluck()
        .get() as number) ?? 0
    );
  }

  public pendingBalance(): bigint {
    return (
      (this.db
        .prepare(`SELECT SUM(heldMilligons) FROM Escrows WHERE settlementDate IS NULL`)
        .pluck()
        .get() as bigint) ?? 0n
    );
  }
}

export interface IEscrowRecord {
  escrowId: string;
  organizationId: string;
  createdByIdentity: string;
  dataDomain?: string;
  heldMilligons: bigint;
  settledMilligons?: bigint;
  settlementDate?: number;
  created: number;
}
