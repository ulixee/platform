import IChromeAliveApis from '@ulixee/apps-chromealive-interfaces/apis';
import sessionResumeApi from './Session.resume';
import sessionStepApi from './Session.step';
import sessionUrlScreenshotApi from './Session.urlScreenshot';
import appBoundsChangedApi from './App.boundsChanged';

// README:
// This wiring makes sure the args/result match the api definitions
// Errors in apiHandlers probably mean you have a misaligned definition in your api, or you need to add your api to IChromeAliveApis
type ApiHandlers = {
  [key in keyof IChromeAliveApis]: (
    args: IChromeAliveApis[key]['args'],
  ) => IChromeAliveApis[key]['result'];
};

const apiHandlers: ApiHandlers = {
  'Session.resume': sessionResumeApi,
  'Session.step': sessionStepApi,
  'Session.urlScreenshot': sessionUrlScreenshotApi,
  'App.boundsChanged': appBoundsChangedApi,
};

export { apiHandlers };
