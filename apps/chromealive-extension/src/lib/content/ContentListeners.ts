import { sendToCore } from './ContentMessenger';

document.addEventListener('visibilitychange', () => {
  const state = document.visibilityState;
  sendToCore({
    event: 'OnPageVisible',
    active: true,
    focused: state === 'visible',
  });
});

window.addEventListener('blur', () => {
  sendToCore({
    event: 'OnPageVisible',
    active: true,
    focused: false,
  });
});

window.addEventListener('focus', () => {
  sendToCore({
    event: 'OnPageVisible',
    active: true,
    focused: true,
  });
});
