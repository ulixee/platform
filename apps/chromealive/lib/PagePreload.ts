// @ts-ignore
const { ipcRenderer } = require('electron');

// @ts-ignore
window.addEventListener('mousemove', () => ipcRenderer.send('mousemove'), { capture: false });

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
document.addEventListener('timeline:resize-height', e => {
  // eslint-disable-next-line no-console
  console.log('timeline:resize-height', e);
  const message = e.detail;
  ipcRenderer.send('timeline:resize-height', message.height);
});

// @ts-ignore
document.addEventListener('toolbar:resize-width', e => {
  // eslint-disable-next-line no-console
  console.log('toolbar:resize-width', e);
  const message = e.detail;
  ipcRenderer.send('toolbar:resize-width', message.width);
});

// @ts-ignore
document.addEventListener('toolbar:closePopupAlert', e => {
  // eslint-disable-next-line no-console
  console.log('toolbar:closePopupAlert', e);
  ipcRenderer.send('toolbar:closePopupAlert');
});

// @ts-ignore
document.addEventListener('toolbar:setAlertContentHeight', e => {
  // eslint-disable-next-line no-console
  console.log('toolbar:setAlertContentHeight', e);
  const message = e.detail;
  ipcRenderer.send('toolbar:setAlertContentHeight', message.height);
});
