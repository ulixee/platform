"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SqliteTable_1 = require("@ulixee/commons/lib/SqliteTable");
class PeersTable extends SqliteTable_1.default {
    constructor(db) {
        super(db, 'QueryLog', [
            ['nodeId', 'TEXT', 'NOT NULL PRIMARY KEY'],
            ['apiHost', 'TEXT', 'NOT NULL'],
            ['kadHost', 'TEXT', 'NOT NULL'],
            ['lastSeenDate', 'DATETIME', 'NOT NULL'],
            ['isVerified', 'INTEGER', 'NOT NULL'],
            ['tags', 'TEXT'],
        ], true);
        this.getQuery = db.prepare(`select * from ${this.tableName} where nodeId=?`);
    }
    updateTag(nodeId, tagName, value) {
        const entry = this.get(nodeId);
        entry.tags ??= {};
        if (value === undefined)
            delete entry.tags[tagName];
        else
            entry.tags[tagName] = value;
        this.db.prepare(`update ${this.tableName} set tags=$tags where nodeId=$nodeId`).run({
            tags: JSON.stringify(entry.tags),
            nodeId,
        });
    }
    isVerified(nodeId, isVerified) {
        this.db
            .prepare(`update ${this.tableName} set isVerified=$isVerified where nodeId=$nodeId`)
            .run({
            isVerified: isVerified === true ? 1 : 0,
            nodeId,
        });
    }
    all() {
        const records = super.all();
        return records.map(x => {
            x.lastSeenDate = new Date(x.lastSeenDate);
            x.tags = JSON.parse(x.tags);
            x.isVerified = Boolean(x.isVerified);
            return x;
        });
    }
    get(nodeId) {
        const record = this.getQuery.get(nodeId);
        if (!record)
            return null;
        record.lastSeenDate = new Date(record.lastSeenDate);
        record.tags = JSON.parse(record.tags);
        record.isVerified = Boolean(record.isVerified);
        return record;
    }
    record(record) {
        this.insertObject({
            ...record,
            lastSeenDate: record.lastSeenDate.getTime(),
            tags: JSON.stringify(record.tags ?? '{}'),
            isVerified: record.isVerified === true ? 1 : 0,
        });
    }
}
exports.default = PeersTable;
//# sourceMappingURL=PeersTable.js.map