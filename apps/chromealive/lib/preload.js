const { ipcRenderer } = require('electron');

document.addEventListener('chromealive:event', e => {
  console.log('chromealive:event', e);
  const message = e.detail;
  ipcRenderer.send('chromealive:event', message.eventType, message.data);
});

document.addEventListener('chromealive:api', e => {
  console.log('chromealive.api', e);
  const message = e.detail;
  ipcRenderer.send('chromealive:api', message.api, message.args);
});
