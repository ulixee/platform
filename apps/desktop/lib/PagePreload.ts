// @ts-ignore
const { ipcRenderer } = require('electron');

// @ts-ignore
document.addEventListener('desktop:api', e => {
  // eslint-disable-next-line no-console
  console.log('desktop:api', e);
  const message = e.detail;
  ipcRenderer.send('desktop:api', message.api, message.args);
});
