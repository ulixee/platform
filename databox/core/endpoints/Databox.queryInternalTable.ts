import { SqlGenerator, SqlParser } from '@ulixee/sql-engine';
import { IAnySchemaJson } from '@ulixee/schema/interfaces/ISchemaJson';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxStorage from '../lib/DataboxStorage';
import DataboxVm from '../lib/DataboxVm';

export default new DataboxApiHandler('Databox.queryInternalTable', {
  async handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }

    const tableName = request.name;
    let storage: DataboxStorage;
    let schema: Record<string, IAnySchemaJson>;
    if (request.databoxVersionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.databoxVersionHash);

      const { registryEntry, manifest } = await context.databoxRegistry.loadVersion(
        request.databoxVersionHash,
      );
      const databox = await DataboxVm.open(registryEntry.path, manifest);
      storage = new DataboxStorage(storagePath);
      schema = databox.metadata.tablesByName[tableName].schema;
    } else {
      context.connectionToClient.databoxStorage ??= new DataboxStorage();
      storage = context.connectionToClient?.databoxStorage;
      schema = storage.getTableSchema(tableName);
    }

    const db = storage.db;
    const sqlParser = new SqlParser(request.sql, { table: tableName });
    const unknownNames = sqlParser.tableNames.filter(x => x !== tableName);
    if (unknownNames.length) {
      throw new Error(
        `Table${unknownNames.length === 1 ? ' does' : 's do'} not exist: ${unknownNames.join(
          ', ',
        )}`,
      );
    }

    if (sqlParser.isInsert()) {
      const sql = sqlParser.toSql();
      const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
      db.prepare(sql).run(boundValues);
      return Promise.resolve();
    }

    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');

    const sql = sqlParser.toSql();
    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const records = db.prepare(sql).all(boundValues);

    SqlGenerator.convertRecordsFromSqlite(records, [schema]);
    return Promise.resolve(records);
  },
});
