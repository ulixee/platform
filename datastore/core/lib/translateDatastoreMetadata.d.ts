import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IDatastoreStatsRecord } from '../db/DatastoreStatsTable';
import { IDatastoreManifestWithLatest } from '../interfaces/IDatastoreRegistryStore';
import { IDatastoreStats } from './StatsTracker';
export default function translateDatastoreMetadata(datastore: IDatastoreManifestWithLatest, datastoreStats: IDatastoreStats, includeSchemaAsJson: boolean): Promise<IDatastoreApiTypes['Datastore.meta']['result']>;
export declare function translateStats(stats: IDatastoreStatsRecord): IDatastoreApiTypes['Datastore.meta']['result']['extractorsByName'][0]['stats'];
