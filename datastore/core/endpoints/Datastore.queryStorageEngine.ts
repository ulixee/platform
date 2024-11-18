import PricingManager from '@ulixee/datastore/lib/PricingManager';
import { SqlParser } from '@ulixee/sql-engine';
import {
  IDatastoreMetadataResult,
  IDatastoreQueryResult,
} from '@ulixee/platform-specification/datastore/DatastoreApis';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { validateAuthentication } from '../lib/datastoreUtils';
import PaymentsProcessor from '../lib/PaymentsProcessor';

export default new DatastoreApiHandler('Datastore.queryStorageEngine', {
  async handler(request, context) {
    request.boundValues ??= [];
    const { id, payment, authentication, version, queryId } = request;

    const startTime = Date.now();
    const manifestWithEntrypoint = await context.datastoreRegistry.get(id, version);

    const storage = context.storageEngineRegistry.get(manifestWithEntrypoint, {
      id,
      version,
      payment,
      authentication,
      queryId,
    });
    const datastore = await context.vm.open(
      manifestWithEntrypoint.runtimePath,
      storage,
      manifestWithEntrypoint,
    );

    await validateAuthentication(datastore, payment, authentication);

    const sqlParser = new SqlParser(request.sql);
    const paymentsProcessor = new PaymentsProcessor(payment, id, datastore, context);
    const tableCalls = sqlParser
      .extractTableCalls()
      .filter(x => !request.virtualEntitiesByName?.[x]);
    await paymentsProcessor.debit(queryId, manifestWithEntrypoint, tableCalls);

    const finalResult: IDatastoreQueryResult = {
      outputs: null,
      latestVersion: manifestWithEntrypoint.latestVersion,
      metadata: {
        bytes: 0,
        microgons: 0n,
        milliseconds: 0,
      },
      runError: null,
    };

    try {
      let upstreamMeta: IDatastoreMetadataResult;
      finalResult.outputs = await storage.query(
        sqlParser,
        request.boundValues,
        {
          id,
          version,
          payment,
          authentication,
          queryId,
          onQueryResult: result => {
            upstreamMeta = result.metadata;
          },
        },
        request.virtualEntitiesByName,
      );

      let basePrice = 0n;
      for (const call of tableCalls) {
        const price = BigInt(
          manifestWithEntrypoint.tablesByName[call]?.prices?.[0]?.basePrice ?? 0,
        );
        basePrice += price;
      }

      paymentsProcessor.trackCallResult('query', basePrice, upstreamMeta);
      const bytes = PricingManager.getOfficialBytes(finalResult.outputs);
      finalResult.metadata.microgons = await paymentsProcessor.finalize(bytes);
      finalResult.metadata.bytes = bytes;
    } catch (error) {
      finalResult.runError = error;
    }

    finalResult.metadata.milliseconds = Date.now() - startTime;

    return finalResult;
  },
});
