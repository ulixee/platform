"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql_engine_1 = require("@ulixee/sql-engine");
const assert = require("assert");
const Table_1 = require("./Table");
class PassthroughTable extends Table_1.default {
    constructor(components) {
        super(components);
        assert(components.remoteTable, 'A remote table is required');
        assert(components.remoteTable.includes('.'), 'A remote table source is required');
        const [source, remoteTable] = components.remoteTable.split('.');
        this.remoteTable = remoteTable;
        this.remoteSource = source;
    }
    async queryInternal(sql, boundValues = [], options = { queryId: undefined }) {
        this.createApiClient();
        if (this.name !== this.remoteTable) {
            const sqlParser = new sql_engine_1.SqlParser(sql, {}, { [this.name]: this.remoteTable });
            sql = sqlParser.toSql();
        }
        const result = await this.upstreamClient.query(this.remoteDatastoreId, this.remoteVersion, sql, {
            boundValues,
            ...options,
        });
        return result.outputs;
    }
    createApiClient() {
        if (this.upstreamClient)
            return;
        const remoteSource = this.remoteSource;
        // need lookup
        const remoteDatastore = this.datastoreInternal.metadata.remoteDatastores[remoteSource];
        assert(remoteDatastore, `A remote datastore source could not be found for ${remoteSource}`);
        try {
            const [datastoreId, datastoreVersion] = remoteDatastore.split('/').pop().split('@v');
            this.remoteDatastoreId = datastoreId;
            this.remoteVersion = datastoreVersion;
            this.upstreamClient = this.datastoreInternal.createApiClient(remoteDatastore);
        }
        catch (error) {
            throw new Error('A valid url was not supplied for this remote datastore. Format should be ulx://<host>/<datastoreId>@v<datastoreVersion>');
        }
    }
}
exports.default = PassthroughTable;
//# sourceMappingURL=PassthroughTable.js.map