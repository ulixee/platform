import type ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import type ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import ISessionApi from './ISessionApi';
import IDevtoolsBackdoorApi from './IDevtoolsBackdoorApi';
import IAppApi from './IAppApi';
import IMouseApi from './IMouseApi';
import IDataboxApi from './IDataboxApi';

export type IChromeAliveApis = {
  'Session.quit': ISessionApi['quit'];
  'Session.timetravel': ISessionApi['timetravel'];
  'Session.resume': ISessionApi['resume'];
  'Session.pause': ISessionApi['pause'];
  'Session.getScreenshot': ISessionApi['getScreenshot'];
  'Session.getScriptState': ISessionApi['getScriptState'];
  'Session.openMode': ISessionApi['openMode'];
  'Session.getDom': ISessionApi['getDom'];
  'Session.getActive': ISessionApi['getActive'];
  'Session.getMeta': ISessionApi['getMeta'];
  'Session.search': ISessionApi['search'];
  'Databox.runExtract': IDataboxApi['runExtract'];
  'Databox.getOutput': IDataboxApi['getOutput'];
  'Databox.getCollectedAssets': IDataboxApi['getCollectedAssets'];
  'App.boundsChanged': IAppApi['boundsChanged'];
  'App.ready': IAppApi['ready'];
  'App.focus': IAppApi['focus'];
  'Mouse.state': IMouseApi['state'];
  'DevtoolsBackdoor.toggleInspectElementMode': IDevtoolsBackdoorApi['toggleInspectElementMode'];
  'DevtoolsBackdoor.highlightNode': IDevtoolsBackdoorApi['highlightNode'];
  'DevtoolsBackdoor.hideHighlight': IDevtoolsBackdoorApi['hideHighlight'];
  'DevtoolsBackdoor.generateQuerySelector': IDevtoolsBackdoorApi['generateQuerySelector'];
};

export type IChromeAliveApiResponse<T extends keyof IChromeAliveApis> = ICoreResponsePayload<
  IChromeAliveApis,
  T
>;

export type IChromeAliveApiRequest<T extends keyof IChromeAliveApis> = ICoreRequestPayload<
  IChromeAliveApis,
  T
  >;
