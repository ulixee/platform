import { IDataboxUpdatedEvent } from './IDataboxUpdatedEvent';
import { IHeroSessionActiveEvent } from './IHeroSessionActiveEvent';

export interface IChromeAliveEvents {
  'App.show': null;
  'App.hide': null;
  'App.quit': null;
  'Session.loading': void;
  'Session.loaded': void;
  'Session.active': IHeroSessionActiveEvent;
  'Databox.updated': IDataboxUpdatedEvent;
}
