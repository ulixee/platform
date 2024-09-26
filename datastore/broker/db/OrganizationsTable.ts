import { Database as SqliteDatabase, Statement } from 'better-sqlite3';
import { nanoid } from 'nanoid';

export default class OrganizationsTable {
  private readonly insertQuery: Statement<IOrganizationRecord>;
  private readonly updateNameQuery: Statement<{ name: string; id: string; modified: number }>;
  private readonly debitQuery: Statement<{ amount: bigint; id: string; modified: number }>;
  private readonly grantQuery: Statement<{ amount: bigint; id: string; modified: number }>;
  private readonly settleQuery: Statement<{
    change: bigint;
    debitedAmount: bigint;
    id: string;
    modified: number;
  }>;

  private readonly getQuery: Statement<{ id: string }>;

  constructor(private db: SqliteDatabase) {
    db.exec(`CREATE TABLE IF NOT EXISTS Organizations (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT,
      totalGranted INTEGER NOT NULL,
      balance INTEGER NOT NULL,
      balanceInChannelHolds INTEGER NOT NULL,
      modified DATETIME NOT NULL,
      CHECK (balance >= 0)
    ) 
`);
    this.insertQuery = db.prepare(
      `INSERT INTO Organizations (id, name, balance, totalGranted, balanceInChannelHolds, modified) VALUES (:id, :name, :balance, :balance, 0, :modified)`,
    );
    this.updateNameQuery = db.prepare(
      `UPDATE Organizations SET name = :name, modified = :modified WHERE id = :id`,
    );
    this.debitQuery = db.prepare(
      `UPDATE Organizations SET balance = balance - :amount, balanceInChannelHolds = balanceInChannelHolds + :amount, modified = :modified WHERE id = :id`,
    );
    this.settleQuery = db.prepare(
      `UPDATE Organizations SET balance = balance + :change, balanceInChannelHolds = balanceInChannelHolds - :debitedAmount, modified = :modified WHERE id = :id`,
    );
    this.grantQuery = db.prepare(
      `UPDATE Organizations SET balance = balance + :amount, totalGranted = totalGranted + :amount, modified = :modified WHERE id = :id`,
    );
    this.getQuery = db.prepare(`SELECT * FROM Organizations WHERE id = :id`);
  }

  public create(name: string, balance: bigint): string {
    const id = nanoid();
    this.insertQuery.run({
      id,
      name,
      totalGranted: balance,
      balanceInChannelHolds: 0n,
      balance,
      modified: Date.now(),
    });
    return id;
  }

  public delete(organizationId: string): void {
    this.db
      .transaction(id => {
        this.db.prepare(`DELETE FROM Users WHERE organizationId = ?`).run(id);
        this.db.prepare(`DELETE FROM Organizations WHERE id = ?`).run(id);
      })
      .default(organizationId);
  }

  public updateName(organizationId: string, name: string): void {
    this.updateNameQuery.run({ id: organizationId, name, modified: Date.now() });
  }

  public debit(organizationId: string, amount: bigint): void {
    this.debitQuery.run({ id: organizationId, amount, modified: Date.now() });
  }

  public grant(organizationId: string, amount: bigint): void {
    this.grantQuery.run({ id: organizationId, amount, modified: Date.now() });
  }

  public settle(organizationId: string, change: bigint, debitedAmount: bigint): void {
    this.settleQuery.run({ id: organizationId, change, debitedAmount, modified: Date.now() });
  }

  public get(organizationId: string): IOrganizationRecord {
    const org = this.getQuery.get({ id: organizationId }) as IOrganizationRecord;
    if (!org) throw new Error(`Organization not found: ${organizationId}`);
    return parseRecord(org);
  }

  /// ADMIN APIS (don't need as much prep, so just do them on the fly)
  public count(): number {
    return (
      (this.db
        .prepare(`SELECT COUNT(*) FROM Organizations`)
        .pluck()
        .safeIntegers(false)
        .get() as number) ?? 0
    );
  }

  public list(): IOrganizationRecord[] {
    return this.db
      .prepare(`SELECT * FROM Organizations`)
      .all()
      .map(parseRecord) as IOrganizationRecord[];
  }

  public totalGranted(): bigint {
    return (
      (this.db
        .prepare(`SELECT SUM(totalGranted) FROM Organizations`)
        .safeIntegers(true)
        .pluck()
        .get() as bigint) ?? 0n
    );
  }

  public totalBalance(): bigint {
    return (
      (this.db
        .prepare(`SELECT SUM(balance) FROM Organizations`)
        .safeIntegers(true)
        .pluck()
        .get() as bigint) ?? 0n
    );
  }
}

function parseRecord(record: IOrganizationRecord): IOrganizationRecord {
  return {
    ...record,
    modified: Number(record.modified),
  };
}

export interface IOrganizationRecord {
  id: string;
  name?: string;
  totalGranted: bigint;
  balance: bigint;
  balanceInChannelHolds: bigint;
  modified: number;
}
