import type ICoreResponsePayload from '@ulixee/net/interfaces/ICoreResponsePayload';
import { IDatastoreApis } from '@ulixee/platform-specification/datastore';
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
  'Session.getResources': IChromeAliveSessionApi['getResources'];
  'Session.getResourceDetails': IChromeAliveSessionApi['getResourceDetails'];
  'Session.getScreenshot': IChromeAliveSessionApi['getScreenshot'];
  'Session.getScriptState': IChromeAliveSessionApi['getScriptState'];
  'Session.openMode': IChromeAliveSessionApi['openMode'];
  'Session.getDom': IChromeAliveSessionApi['getDom'];
  'Session.getMeta': IChromeAliveSessionApi['getMeta'];
  'Session.searchDom': IChromeAliveSessionApi['searchDom'];
  'Session.searchResources': IChromeAliveSessionApi['searchResources'];
  'Session.replayTargetCreated': IChromeAliveSessionApi['replayTargetCreated'];
  'Session.devtoolsTargetOpened': IChromeAliveSessionApi['devtoolsTargetOpened'];
  'Datastore.rerunExtractor': IDatastoreApi['rerunExtractor'];
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
  'Datastores.list': IDatastoreApis['Datastores.list'];
  'Datastore.meta': IDatastoreApis['Datastore.meta'];
  'Datastore.creditsIssued': IDatastoreApis['Datastore.creditsIssued'];
};

export type IChromeAliveSessionApiResponse<T extends keyof IChromeAliveSessionApis> = ICoreResponsePayload<
  IChromeAliveSessionApis,
  T
>;
