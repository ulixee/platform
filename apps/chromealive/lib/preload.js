const { ipcRenderer } = require('electron');

document.addEventListener('chromealive:event', e => {
  // eslint-disable-next-line no-console
  console.log('chromealive:event', e);
  const message = e.detail;
  ipcRenderer.send('chromealive:event', message.eventType, message.data);
});

document.addEventListener('chromealive:api', e => {
  // eslint-disable-next-line no-console
  console.log('chromealive:api', e);
  const message = e.detail;
  ipcRenderer.send('chromealive:api', message.api, message.args);
});
