import ISessionApi from './ISessionApi';
import IAppApi from './IAppApi';
import IMouseApi from './IMouseApi';
import IDomStateApi from './IDomStateApi';

export type IApiHandlerSpec = {
  'Session.quit': ISessionApi['quit'];
  'Session.timetravel': ISessionApi['timetravel'];
  'Session.resume': ISessionApi['resume'];
  'Session.step': ISessionApi['step'];
  'Session.getScreenshot': ISessionApi['getScreenshot'];
  'Session.getScriptState': ISessionApi['getScriptState'];
  'Session.openScreen': ISessionApi['openScreen'],
  'Session.openPlayer': ISessionApi['openPlayer'],
  'Session.getDom':ISessionApi['getDom'];
  'App.boundsChanged': IAppApi['boundsChanged'];
  'App.ready': IAppApi['ready'];
  'App.focus': IAppApi['focus'];
  'Mouse.state': IMouseApi['state'];
  'DomState.load': IDomStateApi['load'];
  'DomState.spawnSession': IDomStateApi['spawnSession'];
  'DomState.unfocusSession': IDomStateApi['unfocusSession'];
  'DomState.openSession': IDomStateApi['openSession'];
  'DomState.modifySessionTimes': IDomStateApi['modifySessionTimes'];
  'DomState.focusSessionTime': IDomStateApi['focusSessionTime'];
  'DomState.extendSessionTime': IDomStateApi['extendSessionTime'];
  'DomState.exit': IDomStateApi['exit'];
};

type IPromiseType<T> = T extends PromiseLike<infer U> ? U : T;

type IApi<T extends (args: any) => any> = {
  args: Parameters<T>[0];
  result: IPromiseType<ReturnType<T>>;
};

export type IChromeAliveApis = {
  [key in keyof IApiHandlerSpec]: IApi<IApiHandlerSpec[key]>;
};

export interface IChromeAliveApiRequest<K extends keyof IChromeAliveApis> {
  api: K;
  messageId: string;
  args: IChromeAliveApis[K]['args'];
}

export interface IChromeAliveApiResponse<K extends keyof IChromeAliveApis> {
  responseId: string;
  result: IChromeAliveApis[K]['result'];
}
