import ISessionApi from './ISessionApi';
import IAppApi from './IAppApi';
import IMouseApi from './IMouseApi';
import PageStateApi from './IPageStateApi';

export type IApiHandlerSpec = {
  'Session.quit': ISessionApi['quit'];
  'Session.timetravel': ISessionApi['timetravel'];
  'Session.resume': ISessionApi['resume'];
  'Session.step': ISessionApi['step'];
  'Session.getScreenshot': ISessionApi['getScreenshot'];
  'App.boundsChanged': IAppApi['boundsChanged'];
  'App.ready': IAppApi['ready'];
  'Mouse.state': IMouseApi['state'];
  'PageState.load': PageStateApi['load'];
  'PageState.addState': PageStateApi['addState'];
  'PageState.removeState': PageStateApi['removeState'];
  'PageState.openSession': PageStateApi['openSession'];
  'PageState.modifySessionTimes': PageStateApi['modifySessionTimes'];
  'PageState.save': PageStateApi['save'];
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
