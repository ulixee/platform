// @ts-ignore
const { ipcRenderer } = require('electron');

// @ts-ignore
document.addEventListener('boss:event', e => {
  // eslint-disable-next-line no-console
  console.log('boss:event', e);
  const message = (e as any).detail;
  ipcRenderer.send('boss:event', message.eventType, message.data);
});

// @ts-ignore
document.addEventListener('boss:api', e => {
  // eslint-disable-next-line no-console
  console.log('boss:api', e);
  const message = (e as any).detail;
  ipcRenderer.send('boss:api', message.api, message.args);
});
