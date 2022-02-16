import ISessionApi from './ISessionApi';
import IAppApi from './IAppApi';
import IMouseApi from './IMouseApi';
import DomStateApi from './IDomStateApi';

export type IApiHandlerSpec = {
  'Session.quit': ISessionApi['quit'];
  'Session.timetravel': ISessionApi['timetravel'];
  'Session.resume': ISessionApi['resume'];
  'Session.step': ISessionApi['step'];
  'Session.getScreenshot': ISessionApi['getScreenshot'];
  'Session.getScriptState': ISessionApi['getScriptState'];
  'Session.getDom':ISessionApi['getDom'];
  'App.boundsChanged': IAppApi['boundsChanged'];
  'App.ready': IAppApi['ready'];
  'App.focus': IAppApi['focus'];
  'Mouse.state': IMouseApi['state'];
  'DomState.load': DomStateApi['load'];
  'DomState.spawnSession': DomStateApi['spawnSession'];
  'DomState.unfocusSession': DomStateApi['unfocusSession'];
  'DomState.openSession': DomStateApi['openSession'];
  'DomState.modifySessionTimes': DomStateApi['modifySessionTimes'];
  'DomState.focusSessionTime': DomStateApi['focusSessionTime'];
  'DomState.extendSessionTime': DomStateApi['extendSessionTime'];
  'DomState.exit': DomStateApi['exit'];
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
