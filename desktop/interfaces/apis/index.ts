import type ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import type ICoreRequestPayload from '@ulixee/net/interfaces/ICoreRequestPayload';
import IChromeAliveSessionApi from './IChromeAliveSessionApi';
import IDevtoolsBackdoorApi from './IDevtoolsBackdoorApi';
import IDatastoreApi from './IDatastoreApi';
import IAppApi from './IAppApi';
import IHeroSessionsApi from './IHeroSessionsApi';

export type IChromeAliveSessionApis = {
  'Session.load': IChromeAliveSessionApi['load'];
  'Session.close': IChromeAliveSessionApi['close'];
  'Session.timetravel': IChromeAliveSessionApi['timetravel'];
  'Session.getTimetravelState': IChromeAliveSessionApi['getTimetravelState'];
  'Session.resume': IChromeAliveSessionApi['resume'];
  'Session.pause': IChromeAliveSessionApi['pause'];
  'Session.getScreenshot': IChromeAliveSessionApi['getScreenshot'];
  'Session.getScriptState': IChromeAliveSessionApi['getScriptState'];
  'Session.openMode': IChromeAliveSessionApi['openMode'];
  'Session.getDom': IChromeAliveSessionApi['getDom'];
  'Session.getMeta': IChromeAliveSessionApi['getMeta'];
  'Session.search': IChromeAliveSessionApi['search'];
  'Session.replayTargetCreated': IChromeAliveSessionApi['replayTargetCreated'];
  'Session.devtoolsTargetOpened': IChromeAliveSessionApi['devtoolsTargetOpened'];
  'Datastore.rerunRunner': IDatastoreApi['rerunRunner'];
  'Datastore.getOutput': IDatastoreApi['getOutput'];
  'Datastore.getCollectedAssets': IDatastoreApi['getCollectedAssets'];
  'DevtoolsBackdoor.toggleInspectElementMode': IDevtoolsBackdoorApi['toggleInspectElementMode'];
  'DevtoolsBackdoor.highlightNode': IDevtoolsBackdoorApi['highlightNode'];
  'DevtoolsBackdoor.hideHighlight': IDevtoolsBackdoorApi['hideHighlight'];
  'DevtoolsBackdoor.generateQuerySelector': IDevtoolsBackdoorApi['generateQuerySelector'];
};

export type IDesktopAppApis = {
  'App.connect': IAppApi['connect'];
  'Sessions.search': IHeroSessionsApi['search'];
  'Sessions.list': IHeroSessionsApi['list'];
};

export type IChromeAliveSessionApiResponse<T extends keyof IChromeAliveSessionApis> = ICoreResponsePayload<
  IChromeAliveSessionApis,
  T
>;

export type IChromeAliveSessionApiRequest<T extends keyof IChromeAliveSessionApis> = ICoreRequestPayload<
  IChromeAliveSessionApis,
  T
>;
