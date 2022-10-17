import { IChromeAliveApis } from '@ulixee/apps-chromealive-interfaces/apis';
import MouseApi from './MouseApi';
import AppApi from './AppApi';
import SessionApi from './SessionApi';
import DevtoolsBackdoorApi from './DevtoolsBackdoorApi';
import DataboxApi from './DataboxApi';

const ApiHandlers: IChromeAliveApis = {
  'App.boundsChanged': AppApi.boundsChanged,
  'App.ready': AppApi.ready,
  'App.focus': AppApi.focus,
  'Mouse.state': MouseApi.state,
  'Session.quit': SessionApi.quit,
  'Session.openMode': SessionApi.openMode,
  'Session.timetravel': SessionApi.timetravel,
  'Session.resume': SessionApi.resume,
  'Session.pause': SessionApi.pause,
  'Session.getScreenshot': SessionApi.getScreenshot,
  'Session.getScriptState': SessionApi.getScriptState,
  'Session.getDom': SessionApi.getDom,
  'Session.getActive': SessionApi.getActive,
  'Session.getMeta': SessionApi.getMeta,
  'Session.search': SessionApi.search,
  'Databox.getOutput': DataboxApi.getOutput,
  'Databox.getCollectedAssets': DataboxApi.getCollectedAssets,
  'Databox.execExtract': DataboxApi.execExtract,
  'DevtoolsBackdoor.toggleInspectElementMode': DevtoolsBackdoorApi.toggleInspectElementMode,
  'DevtoolsBackdoor.highlightNode': DevtoolsBackdoorApi.highlightNode,
  'DevtoolsBackdoor.hideHighlight': DevtoolsBackdoorApi.hideHighlight,
  'DevtoolsBackdoor.generateQuerySelector': DevtoolsBackdoorApi.generateQuerySelector,
};

export default ApiHandlers;
