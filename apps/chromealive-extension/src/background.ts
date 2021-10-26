/// <reference types="chrome"/>
import { onMessagePayload } from './lib/background/BackgroundMessenger';
import { groupTabs, ungroupTabs } from './lib/background/TabManagement';
import logDebug from './lib/logDebug';

const RuntimeActions = {
  groupTabs,
  ungroupTabs,
};

onMessagePayload((payload, sendResponseFn) => {
  if (RuntimeActions[payload.action]) {
    const fn = RuntimeActions[payload.action];
    fn(payload)
      .catch(error => {
        if (sendResponseFn) sendResponseFn(error);
        logDebug('chrome.runtime.onMessage:ERROR', { payload, error });
      })
      .then(result => {
        if (sendResponseFn) sendResponseFn(result);
        logDebug('chrome.runtime.onMessage:Result', { payload, result });
        return null;
      })
      .catch(() => null);
    return true;
  }
  console.log('UNHANDLED MESSAGE: ', payload);
});
