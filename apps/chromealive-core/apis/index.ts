import IChromeAliveApis from '@ulixee/apps-chromealive-interfaces/apis';
import sessionResumeApi from './Session.resume';
import sessionReplayApi from './Session.replay';
import sessionStepApi from './Session.step';
import sessionQuitApi from './Session.quit';
import appBoundsChangedApi from './App.boundsChanged';
import appReadyApi from './App.ready';
import mouseStateApi from './Mouse.state';
import sessionGetScreenshotApi from './Session.getScreenshot';

// README:
// This wiring makes sure the args/result match the api definitions
// Errors in apiHandlers probably mean you have a misaligned definition in your api, or you need to add your api to IChromeAliveApis
type ApiHandlers = {
  [key in keyof IChromeAliveApis]: (
    args: IChromeAliveApis[key]['args'],
  ) => IChromeAliveApis[key]['result'] | Promise<IChromeAliveApis[key]['result']>;
};

const apiHandlers: ApiHandlers = {
  'Session.quit': sessionQuitApi,
  'Session.replay': sessionReplayApi,
  'Session.resume': sessionResumeApi,
  'Session.step': sessionStepApi,
  'Session.getScreenshot': sessionGetScreenshotApi,
  'App.boundsChanged': appBoundsChangedApi,
  'App.ready': appReadyApi,
  'Mouse.state': mouseStateApi,
};

export { apiHandlers };
