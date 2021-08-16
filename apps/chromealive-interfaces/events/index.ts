import IOutputUpdatedEvent from './IOutputUpdatedEvent';
import ISessionActiveEvent from './ISessionActiveEvent';

export default interface IChromeAliveEvents {
  'App.show': null;
  'App.hide': null;
  'App.quit': null;
  'Session.active': ISessionActiveEvent;
  'Output.updated': IOutputUpdatedEvent;
}
