import IQueryOptions from '@ulixee/datastore/interfaces/IQueryOptions';
import { IQueryInternalCallbacks } from '@ulixee/datastore/lib/DatastoreInternal';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { IDatastoreMetadataResult } from '@ulixee/platform-specification/datastore/DatastoreApis';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import QueryRunner from '../lib/QueryRunner';

export default new DatastoreApiHandler('Datastore.stream', {
  async handler(request, context) {
    const name = request.name;
    const queryRunner = new QueryRunner(context, request);
    const datastore = await queryRunner.openDatastore();

    const datastoreFunction = datastore.extractors[name] ?? datastore.crawlers[name];

    const datastoreTable = datastore.tables[name];
    if (!datastoreFunction && !datastoreTable) {
      throw new Error(`${name} is not a valid Entity name for this Datastore.`);
    }

    const query = `stream(${name})`;
    const didFail = await queryRunner.beforeAll(query, request.input, [name]);
    if (didFail) return didFail;

    const callbacks: IQueryInternalCallbacks = {
      async onFunction(...args) {
        return await queryRunner.runFunction(...args);
      },
      async onPassthroughTable(...args) {
        return await queryRunner.onPassthroughTable(...args);
      },
      beforeStorageEngine(options: IQueryOptions): IQueryOptions {
        return queryRunner.beforeStorageEngine(options);
      },
    };

    try {
      let streamer: ResultIterable<any>;
      if (datastoreFunction) {
        streamer = datastoreFunction.runInternal(request, callbacks);
      } else {
        let metadata: IDatastoreMetadataResult;
        streamer = await datastoreTable.fetchInternal(
          {
            ...request,
            onQueryResult(result) {
              metadata ??= result.metadata;
            },
          },
          callbacks,
        );

        const price = datastore.tables[name].basePrice;
        if (price) queryRunner.paymentsProcessor.trackCallResult(name, price, metadata);
      }

      for await (const record of streamer) {
        context.connectionToClient.sendEvent({
          listenerId: request.id,
          data: record as any,
          eventType: 'Stream.output',
        });
      }
      await new Promise(setImmediate);
      return queryRunner.finalize(query, request.input, streamer.results);
    } catch (error) {
      return queryRunner.finalize(query, request.input, error);
    }
  },
});
