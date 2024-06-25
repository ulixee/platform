import { Database as SqliteDatabase, Statement } from 'better-sqlite3';

export default class UsersTable {
  private readonly insertQuery: Statement<IUserRecord>;
  private readonly getOrganizationQuery: Statement<{ identity: string }>;
  constructor(private db: SqliteDatabase) {
    db.exec(`CREATE TABLE IF NOT EXISTS Users (
      identity TEXT NOT NULL PRIMARY KEY,
      name TEXT,
      organizationId TEXT NOT NULL,
      modified DATETIME NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES Organizations(id)
    )`);
    db.exec(`CREATE INDEX IF NOT EXISTS Users_organizationId ON Users(organizationId)`);

    this.insertQuery = db.prepare(
      `INSERT INTO Users (name, organizationId, identity, modified) VALUES (:name, :organizationId, :identity, :modified)`,
    );
    this.getOrganizationQuery = db.prepare(
      `SELECT organizationId FROM Users WHERE identity = :identity`,
    );
  }

  public create(identity: string, name: string, organizationId: string): void {
    this.insertQuery.run({ identity, name, organizationId, modified: Date.now() });
  }

  public editName(identity: string, name: string): void {
    this.db
      .prepare(`UPDATE Users SET name = :name, modified = :modified WHERE identity = :identity`)
      .run({ identity, name, modified: Date.now() });
  }

  public getOrganizationId(identity: string): string {
    return this.getOrganizationQuery.safeIntegers(false).pluck().get({ identity }) as string;
  }

  /// ADMIN APIs
  public count(): number {
    const count = (this.db.prepare(`SELECT COUNT(*) FROM Users`).pluck().get() as bigint) ?? 0n;
    return Number(count);
  }

  public list(): IUserRecord[] {
    return this.db
      .prepare(`SELECT * FROM Users`)
      .safeIntegers(false)
      .all()
      .map(parseRecord) as IUserRecord[];
  }

  public delete(identity: string): void {
    this.db.prepare(`DELETE FROM Users WHERE identity = ?`).run(identity);
  }

  public listByOrganization(organizationId: string): IUserRecord[] {
    return this.db
      .prepare(`SELECT * FROM Users WHERE organizationId = ?`)
      .safeIntegers(false)
      .all(organizationId) as IUserRecord[];
  }
}

function parseRecord(record: IUserRecord): IUserRecord {
  return {
    ...record,
    modified: Number(record.modified),
  };
}

export interface IUserRecord {
  identity: string;
  name?: string;
  organizationId: string;
  modified: number;
}
