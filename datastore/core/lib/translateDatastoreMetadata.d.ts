import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import { IDatastoreStats } from './StatsTracker';
import { IDatastoreManifestWithLatest } from '../interfaces/IDatastoreRegistryStore';
export default function translateDatastoreMetadata(datastore: IDatastoreManifestWithLatest, datastoreStats: IDatastoreStats, context: IDatastoreApiContext, includeSchemaAsJson: boolean): Promise<IDatastoreApiTypes['Datastore.meta']['result']>;
export declare function translateStats(stats: IDatastoreStatsRecord): IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][0]['stats'];
