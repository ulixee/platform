import { IApiHandlerSpec } from '@ulixee/apps-chromealive-interfaces/apis';
import MouseApi from './MouseApi';
import AppApi from './AppApi';
import SessionApi from './SessionApi';
import DomStateApi from './DomStateApi';

const ApiHandlers: IApiHandlerSpec = {
  'App.boundsChanged': AppApi.boundsChanged,
  'App.ready': AppApi.ready,
  'App.focus': AppApi.focus,
  'Mouse.state': MouseApi.state,
  'DomState.load': DomStateApi.load,
  'DomState.spawnSession': DomStateApi.spawnSession,
  'DomState.modifySessionTimes': DomStateApi.modifySessionTimes,
  'DomState.focusSessionTime': DomStateApi.focusSessionTime,
  'DomState.extendSessionTime': DomStateApi.extendSessionTime,
  'DomState.unfocusSession': DomStateApi.unfocusSession,
  'DomState.openSession': DomStateApi.openSession,
  'DomState.exit': DomStateApi.exit,
  'Session.quit': SessionApi.quit,
  'Session.timetravel': SessionApi.timetravel,
  'Session.resume': SessionApi.resume,
  'Session.step': SessionApi.step,
  'Session.getScreenshot': SessionApi.getScreenshot,
  'Session.getScriptState': SessionApi.getScriptState,
  'Session.getDom': SessionApi.getDom,
};

export default ApiHandlers;
