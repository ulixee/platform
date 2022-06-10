/// <reference types="chrome"/>
import { onMessagePayload } from './lib/background/BackgroundMessenger';
import { hideTabs } from './lib/background/TabManagement';
import logDebug from './lib/logDebug';
import './lib/background/BackgroundListeners';

// variable injected!
// eslint-disable-next-line @typescript-eslint/naming-convention
const __CORE_SERVER_ADDRESS__ = '';

const RuntimeActions = {
  hideTabs,
};

onMessagePayload((payload, sendResponseFn) => {
  if (RuntimeActions[payload.action]) {
    const fn = RuntimeActions[payload.action];
    fn(payload)
      .catch(error => {
        if (sendResponseFn) {
          sendResponseFn(error);
          sendResponseFn = null;
        }
        console.error('chrome.runtime.onMessage:ERROR', { payload, error });
      })
      .then(result => {
        if (sendResponseFn) sendResponseFn(result);
        logDebug('chrome.runtime.onMessage:Result', { payload, result });
        return null;
      })
      .catch(error => console.error('chrome.runtime.onMessageResponse:ERROR', { payload, error }));
    return true;
  } if (payload.action === 'getCoreServerAddress') {
    sendResponseFn(__CORE_SERVER_ADDRESS__);
    return true;
  }
  console.log('UNHANDLED MESSAGE: ', payload);
});
