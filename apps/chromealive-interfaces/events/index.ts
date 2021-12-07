import IDataboxUpdatedEvent from './IDataboxUpdatedEvent';
import IHeroSessionActiveEvent from './IHeroSessionActiveEvent';
import IPageStateUpdateEvent from './IPageStateUpdatedEvent';
import IAppMoveEvent from './IAppMoveEvent';

export default interface IChromeAliveEvents {
  'App.show': null;
  'App.hide': null;
  'App.startedDraggingChrome': null;
  'App.stoppedDraggingChrome': null;
  'App.quit': null;
  'App.onTop': boolean;
  'App.move': IAppMoveEvent;
  'App.mode': 'live' | 'pagestate-generator';
  'Session.loading': void;
  'Session.loaded': void;
  'Session.active': IHeroSessionActiveEvent;
  'Databox.updated': IDataboxUpdatedEvent;
  'PageState.updated': IPageStateUpdateEvent;
}
