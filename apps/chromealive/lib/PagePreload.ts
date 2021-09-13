// @ts-ignore
const { ipcRenderer } = require('electron');

// @ts-ignore
window.addEventListener('mousemove', () => ipcRenderer.send('mousemove'), { capture: false });

// @ts-ignore
document.addEventListener('chromealive:event', e => {
  // eslint-disable-next-line no-console
  console.log('chromealive:event', e);
  const message = (e as any).detail;
  ipcRenderer.send('chromealive:event', message.eventType, message.data);
});

// @ts-ignore
document.addEventListener('chromealive:api', e => {
  // eslint-disable-next-line no-console
  console.log('chromealive:api', e);
  const message = (e as any).detail;
  ipcRenderer.send('chromealive:api', message.api, message.args);
});

// @ts-ignore
document.addEventListener('app:height-changed', e => {
  // eslint-disable-next-line no-console
  console.log('app:height-changed', e);
  const message = (e as any).detail;
  ipcRenderer.send('resize-height', message.height);
});
