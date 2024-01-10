"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SqliteTable_1 = require("@ulixee/commons/lib/SqliteTable");
class RecordsTable extends SqliteTable_1.default {
    constructor(db) {
        super(db, 'Records', [
            ['key', 'BLOB', 'NOT NULL PRIMARY KEY'],
            ['publicKey', 'BLOB', 'NOT NULL'],
            ['value', 'TEXT', 'NOT NULL'],
            ['timestamp', 'DATETIME', 'NOT NULL'],
            ['signature', 'BLOB', 'NOT NULL'],
            ['receivedTimestamp', 'DATETIME', 'NOT NULL'],
            ['isOwnRecord', 'INTEGER', 'NOT NULL'],
        ], true);
    }
    put(key, record, isOwnRecord) {
        this.insertObject({
            key,
            ...record,
            isOwnRecord: isOwnRecord ? 1 : 0,
            receivedTimestamp: Date.now(),
        });
    }
    get(key) {
        const record = this.db
            .prepare(`select * from ${this.tableName} where key=$key`)
            .get({ key });
        if (record) {
            record.isOwnRecord = Boolean(record.isOwnRecord);
        }
        return record;
    }
    delete(key) {
        this.db.prepare(`delete from ${this.tableName} where key=$key`).run({ key });
    }
    getIfNotExpired(key) {
        const record = this.get(key);
        // Check validity: compare time received with max record age
        if (record &&
            !record.isOwnRecord &&
            Date.now() - record.receivedTimestamp > RecordsTable.MAX_RECORD_AGE) {
            // If record is bad delete it and return
            this.delete(key);
            return;
        }
        return record;
    }
}
exports.default = RecordsTable;
RecordsTable.MAX_RECORD_AGE = 36 * 60e3;
//# sourceMappingURL=RecordsTable.js.map