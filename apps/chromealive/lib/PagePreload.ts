// @ts-ignore
const { ipcRenderer } = require('electron');

// @ts-ignore
window.addEventListener('mousemove', () => ipcRenderer.send('App:mousemove'), { capture: false });

// @ts-ignore
document.addEventListener('chromealive:event', e => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.log('chromealive:event', message.eventType, message.data);
});

// @ts-ignore
document.addEventListener('chromealive:api', e => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.log('chromealive:api', message.command, message.args);
  ipcRenderer.send('chromealive:api', message.command, message.args);
});

// @ts-ignore
document.addEventListener('App:changeHeight', e => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.log('App:changeHeight', message.height);
  ipcRenderer.send('App:changeHeight', message.height);
});

// @ts-ignore
document.addEventListener('App:showChildWindow', e => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.log('App:showChildWindow', message.frameName);
  ipcRenderer.send('App:showChildWindow', message.frameName);
});

// @ts-ignore
document.addEventListener('App:hideChildWindow', e => {
  const message = e.detail;
  // eslint-disable-next-line no-console
  console.log('App:hideChildWindow',  message.frameName);
  ipcRenderer.send('App:hideChildWindow', message.frameName);
});
