// @ts-ignore
const { ipcRenderer } = require('electron');

// @ts-ignore
window.addEventListener('mousemove', () => ipcRenderer.send('App:mousemove'), { capture: false });

// @ts-ignore
document.addEventListener('chromealive:event', e => {
  // eslint-disable-next-line no-console
  console.log('chromealive:event', e);
  const message = e.detail;
  ipcRenderer.send('chromealive:event', message.eventType, message.data);
});

// @ts-ignore
document.addEventListener('chromealive:api', e => {
  // eslint-disable-next-line no-console
  console.log('chromealive:api', e);
  const message = e.detail;
  ipcRenderer.send('chromealive:api', message.api, message.args);
});

// @ts-ignore
document.addEventListener('App:changeHeight', e => {
  // eslint-disable-next-line no-console
  console.log('App:changeHeight', e);
  const message = e.detail;
  ipcRenderer.send('App:changeHeight', message.height);
});

// @ts-ignore
document.addEventListener('App:showChildWindow', e => {
  // eslint-disable-next-line no-console
  console.log('App:showChildWindow', e);
  const message = e.detail;
  ipcRenderer.send('App:showChildWindow', message.frameName);
});

// @ts-ignore
document.addEventListener('App:hideChildWindow', e => {
  // eslint-disable-next-line no-console
  console.log('App:hideChildWindow', e);
  const message = e.detail;
  ipcRenderer.send('App:hideChildWindow', message.frameName);
});
