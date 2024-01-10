"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SqliteTable_1 = require("@ulixee/commons/lib/SqliteTable");
class ProvidersTable extends SqliteTable_1.default {
    constructor(db) {
        super(db, 'Providers', [
            ['providerNodeId', 'TEXT', 'NOT NULL PRIMARY KEY'],
            ['key', 'BLOB', 'NOT NULL PRIMARY KEY'],
            ['publishedTimestamp', 'DATETIME', 'NOT NULL'],
            ['expirationTimestamp', 'DATETIME', 'NOT NULL'],
        ], true);
    }
    record(record) {
        this.insertObject(record);
    }
    updateExpiration(providerNodeId, key, timestamp) {
        this.db
            .prepare(`update ${this.tableName} set expirationTimestamp=$timestamp where providerNodeId=$providerNodeId and key=$key`)
            .run({ providerNodeId, key, timestamp });
    }
    getWithKey(key) {
        return this.db
            .prepare(`select * from ${this.tableName} where key=$key`)
            .all({ key });
    }
    delete(providerNodeId, key) {
        this.db
            .prepare(`delete from ${this.tableName} where providerNodeId=$providerNodeId and key=$key`)
            .run({ providerNodeId, key });
    }
}
exports.default = ProvidersTable;
//# sourceMappingURL=ProvidersTable.js.map