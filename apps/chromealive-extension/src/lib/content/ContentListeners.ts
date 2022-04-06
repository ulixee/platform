import { sendToCore } from './ContentMessenger';

document.addEventListener('visibilitychange', () => {
  const state = document.visibilityState;
  sendToCore({
    event: 'OnPageVisible',
    active: true,
    focused: state === 'visible',
  });
});
