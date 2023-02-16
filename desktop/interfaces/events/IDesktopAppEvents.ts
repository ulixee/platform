import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import { IHeroSessionsListResult } from '../apis/IHeroSessionsApi';

export default interface IDesktopAppEvents {
  'App.quit': null;
  'Session.opened': INewHeroSessionEvent;
  'Session.created': INewHeroSessionEvent;
  'Sessions.listUpdated': IHeroSessionsListResult[];
}

export interface INewHeroSessionEvent {
  heroSessionId: string;
  options: ISessionCreateOptions;
  dbPath: string;
  startDate: Date;
}
