"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Database = require("better-sqlite3");
const Fs = require("node:fs");
const EscrowsTable_1 = require("./EscrowsTable");
const OrganizationsTable_1 = require("./OrganizationsTable");
const UsersTable_1 = require("./UsersTable");
class DatabrokerDb {
    constructor(baseDir) {
        if (!Fs.existsSync(baseDir))
            Fs.mkdirSync(baseDir, { recursive: true });
        this.db = new Database(`${baseDir}/databroker.v0.db`);
        this.db.unsafeMode(false);
        this.db.defaultSafeIntegers(true);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.organizations = new OrganizationsTable_1.default(this.db);
        this.users = new UsersTable_1.default(this.db);
        this.escrows = new EscrowsTable_1.default(this.db);
    }
    close() {
        if (this.db) {
            this.db.close();
        }
        this.db = null;
    }
    transaction(fn) {
        return this.db.transaction(fn).default();
    }
    exec(sql) {
        this.db.exec(sql);
    }
}
exports.default = DatabrokerDb;
//# sourceMappingURL=index.js.map