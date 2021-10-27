import { IApiHandlerSpec } from '@ulixee/apps-chromealive-interfaces/apis';
import MouseApi from './MouseApi';
import AppApi from './AppApi';
import SessionApi from './SessionApi';
import PageStateApi from './PageStateApi';

const ApiHandlers: IApiHandlerSpec = {
  'App.boundsChanged': AppApi.boundsChanged,
  'App.ready': AppApi.ready,
  'App.focus': AppApi.focus,
  'Mouse.state': MouseApi.state,
  'PageState.load': PageStateApi.load,
  'PageState.addState': PageStateApi.addState,
  'PageState.renameState': PageStateApi.renameState,
  'PageState.removeState': PageStateApi.removeState,
  'PageState.spawnSession': PageStateApi.spawnSession,
  'PageState.modifySessionTimes': PageStateApi.modifySessionTimes,
  'PageState.unfocusSession': PageStateApi.unfocusSession,
  'PageState.openSession': PageStateApi.openSession,
  'PageState.save': PageStateApi.save,
  'Session.quit': SessionApi.quit,
  'Session.timetravel': SessionApi.timetravel,
  'Session.resume': SessionApi.resume,
  'Session.step': SessionApi.step,
  'Session.getScreenshot': SessionApi.getScreenshot,
};

export default ApiHandlers;
