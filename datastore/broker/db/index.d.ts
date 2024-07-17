import EscrowsTable from './EscrowsTable';
import OrganizationsTable from './OrganizationsTable';
import UsersTable from './UsersTable';
export default class DatabrokerDb {
    readonly organizations: OrganizationsTable;
    readonly users: UsersTable;
    readonly escrows: EscrowsTable;
    private db;
    constructor(baseDir: string);
    close(): void;
    transaction<T>(fn: () => T): T;
    exec(sql: string): void;
}
