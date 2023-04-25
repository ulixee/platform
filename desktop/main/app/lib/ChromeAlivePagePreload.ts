// @ts-ignore
const { ipcRenderer } = require('electron');


// @ts-ignore
document.addEventListener('chromealive:event', (e: any) => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.debug(message.eventType, message.data);
});

const caMessagesById = new Map();
// @ts-ignore
document.addEventListener('chromealive:api', (e: any) => {
  const message = e.detail;
  caMessagesById.set(`${message.clientId}_${message.messageId}`, message);
  ipcRenderer.send('chromealive:api', message.command, message.args);
});

// @ts-ignore
document.addEventListener('chromealive:api:response', (e: any) => {
  const message = e.detail;
  const key = `${message.clientId}_${message.responseId}`;
  const original = caMessagesById.get(key);
  caMessagesById.delete(key);
  // eslint-disable-next-line no-console
  console.debug(original?.command, { args: original?.args?.[0], result: message.data });
});

// @ts-ignore
document.addEventListener('App:changeHeight', (e: any) => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.debug('App:changeHeight', message.height);
  ipcRenderer.send('App:changeHeight', message.height);
});

// @ts-ignore
document.addEventListener('App:showChildWindow', (e: any) => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.debug('App:showChildWindow', message.frameName);
  ipcRenderer.send('App:showChildWindow', message.frameName);
});

// @ts-ignore
document.addEventListener('App:hideChildWindow', (e: any) => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.debug('App:hideChildWindow', message.frameName);
  ipcRenderer.send('App:hideChildWindow', message.frameName);
});
