"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Database = require("better-sqlite3");
const Fs = require("fs");
const Path = require("path");
const PeersTable_1 = require("./PeersTable");
const ProvidersTable_1 = require("./ProvidersTable");
const RecordsTable_1 = require("./RecordsTable");
class KadDb {
    constructor(dbPath) {
        const baseDir = Path.dirname(dbPath);
        if (!Fs.existsSync(baseDir))
            Fs.mkdirSync(baseDir, { recursive: true });
        this.db = new Database(dbPath);
        this.db.unsafeMode(false);
        this.db.pragma('journal_mode = WAL');
        this.peers = new PeersTable_1.default(this.db);
        this.providers = new ProvidersTable_1.default(this.db);
        this.records = new RecordsTable_1.default(this.db);
    }
    get isOpen() {
        return this.db?.open ?? false;
    }
    close() {
        if (this.db?.open) {
            this.db?.close();
        }
        this.db = null;
    }
}
exports.default = KadDb;
//# sourceMappingURL=KadDb.js.map