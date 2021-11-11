import IDataboxUpdatedEvent from './IDataboxUpdatedEvent';
import IHeroSessionActiveEvent from './IHeroSessionActiveEvent';
import IPageStateUpdateEvent from './IPageStateUpdatedEvent';

export default interface IChromeAliveEvents {
  'App.show': null;
  'App.hide': null;
  'App.quit': null;
  'App.onTop': boolean;
  'App.mode': 'live' | 'pagestate-generator';
  'Session.loading': void;
  'Session.loaded': void;
  'Session.active': IHeroSessionActiveEvent;
  'Databox.updated': IDataboxUpdatedEvent;
  'PageState.updated': IPageStateUpdateEvent;
}
