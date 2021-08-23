const { ipcRenderer } = require('electron');

document.addEventListener('boss:event', e => {
  // eslint-disable-next-line no-console
  console.log('boss:event', e);
  const message = e.detail;
  ipcRenderer.send('boss:event', message.eventType, message.data);
});

document.addEventListener('boss:api', e => {
  // eslint-disable-next-line no-console
  console.log('boss:api', e);
  const message = e.detail;
  ipcRenderer.send('boss:api', message.api, message.args);
});
