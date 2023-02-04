import type ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import type ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import ISessionApi from './ISessionApi';
import IDevtoolsBackdoorApi from './IDevtoolsBackdoorApi';
import IDatastoreApi from './IDatastoreApi';
import IAppApi from './IAppApi';

export type IChromeAliveSessionApis = {
  'Session.load': ISessionApi['load'];
  'Session.close': ISessionApi['close'];
  'Session.timetravel': ISessionApi['timetravel'];
  'Session.getTimetravelState': ISessionApi['getTimetravelState'];
  'Session.resume': ISessionApi['resume'];
  'Session.pause': ISessionApi['pause'];
  'Session.getScreenshot': ISessionApi['getScreenshot'];
  'Session.getScriptState': ISessionApi['getScriptState'];
  'Session.openMode': ISessionApi['openMode'];
  'Session.getDom': ISessionApi['getDom'];
  'Session.getMeta': ISessionApi['getMeta'];
  'Session.search': ISessionApi['search'];
  'Session.replayTargetCreated': ISessionApi['replayTargetCreated'];
  'Session.devtoolsTargetOpened': ISessionApi['devtoolsTargetOpened'];
  'Datastore.rerunRunner': IDatastoreApi['rerunRunner'];
  'Datastore.getOutput': IDatastoreApi['getOutput'];
  'Datastore.getCollectedAssets': IDatastoreApi['getCollectedAssets'];
  'DevtoolsBackdoor.toggleInspectElementMode': IDevtoolsBackdoorApi['toggleInspectElementMode'];
  'DevtoolsBackdoor.highlightNode': IDevtoolsBackdoorApi['highlightNode'];
  'DevtoolsBackdoor.hideHighlight': IDevtoolsBackdoorApi['hideHighlight'];
  'DevtoolsBackdoor.generateQuerySelector': IDevtoolsBackdoorApi['generateQuerySelector'];
};

export type IChromeAliveAppApis = {
  'App.connect': IAppApi['connect'];
};

export type IChromeAliveApiResponse<T extends keyof IChromeAliveSessionApis> = ICoreResponsePayload<
  IChromeAliveSessionApis,
  T
>;

export type IChromeAliveApiRequest<T extends keyof IChromeAliveSessionApis> = ICoreRequestPayload<
  IChromeAliveSessionApis,
  T
>;
