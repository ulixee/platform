import ISessionResumeApi from './ISessionResumeApi';
import ISessionStepApi from './ISessionStepApi';
import ISessionUrlScreenshotApi from './ISessionUrlScreenshotApi';
import IAppBoundsChangedApi from './IAppBoundsChangedApi';

export default interface IChromeAliveApis {
  'Session.resume': ISessionResumeApi;
  'Session.step': ISessionStepApi;
  'Session.urlScreenshot': ISessionUrlScreenshotApi;
  'App.boundsChanged': IAppBoundsChangedApi;
}

export interface IChromeAliveApiRequest<T extends keyof IChromeAliveApis> {
  api: T;
  messageId: string;
  args: IChromeAliveApis[T]['args'];
}

export interface IChromeAliveApiResponse<T extends keyof IChromeAliveApis> {
  responseId: string;
  result: IChromeAliveApis[T]['result'];
}
