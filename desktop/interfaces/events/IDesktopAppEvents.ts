import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import IDatastoreApiTypes from '@ulixee/platform-specification/datastore/DatastoreApis';
import { IHeroSessionsListResult } from '../apis/IHeroSessionsApi';

export default interface IDesktopAppEvents {
  'App.quit': null;
  'Session.opened': INewHeroSessionEvent;
  'Session.created': INewHeroSessionEvent;
  'Sessions.listUpdated': IHeroSessionsListResult[];
  'Datastore.new': {
    activity: string;
    datastore: IDatastoreApiTypes['Datastore.meta']['result'];
  };
  'Datastore.stats': Pick<IDatastoreApiTypes['Datastore.meta']['result'], 'stats' | 'versionHash'>;
  'Datastore.stopped': { versionHash: string };
}

export interface INewHeroSessionEvent {
  heroSessionId: string;
  options: ISessionCreateOptions;
  dbPath: string;
  startDate: Date;
}
