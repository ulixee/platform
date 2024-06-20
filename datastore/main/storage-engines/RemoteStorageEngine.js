"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql_engine_1 = require("@ulixee/sql-engine");
const AbstractStorageEngine_1 = require("./AbstractStorageEngine");
class RemoteStorageEngine extends AbstractStorageEngine_1.default {
    constructor(connectionToCore, metadata) {
        super();
        this.connectionToCore = connectionToCore;
        this.metadata = metadata;
    }
    close() {
        this.connectionToCore = null;
        return Promise.resolve();
    }
    async query(sql, boundValues, metadata, virtualEntitiesByName) {
        if (sql instanceof sql_engine_1.SqlParser)
            sql = sql.toSql();
        const result = (await this.connectionToCore.sendRequest({
            command: 'Datastore.queryStorageEngine',
            args: [
                {
                    sql,
                    boundValues,
                    virtualEntitiesByName,
                    ...this.metadata,
                    ...metadata ?? {},
                },
            ],
        }));
        // TODO: how to surface the payment/other metadata here...
        return result.outputs;
    }
    async createRemote(version, previousVersion) {
        await this.connectionToCore.sendRequest({
            command: 'Datastore.createStorageEngine',
            args: [
                {
                    version,
                    previousVersion,
                },
            ],
        });
    }
    createTable() {
        throw new Error('Invalid call on a remote Storage Engine');
    }
}
exports.default = RemoteStorageEngine;
//# sourceMappingURL=RemoteStorageEngine.js.map