import IDataboxUpdatedEvent from './IDataboxUpdatedEvent';
import IHeroSessionActiveEvent from './IHeroSessionActiveEvent';
import IPageStateUpdateEvent from './IPageStateUpdatedEvent';
import IAppMoveEvent from './IAppMoveEvent';
import IAppModeEvent from './IAppModeEvent';

export default interface IChromeAliveEvents {
  'App.show': { onTop: boolean };
  'App.hide': null;
  'App.startedDraggingChrome': null;
  'App.stoppedDraggingChrome': null;
  'App.quit': null;
  'App.move': IAppMoveEvent;
  'App.mode': IAppModeEvent;
  'Session.loading': void;
  'Session.loaded': void;
  'Session.active': IHeroSessionActiveEvent;
  'Databox.updated': IDataboxUpdatedEvent;
  'PageState.updated': IPageStateUpdateEvent;
}
