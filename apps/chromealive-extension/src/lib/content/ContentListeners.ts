import { sendToCore } from './ContentMessenger';

document.addEventListener('visibilitychange', () => {
  const state = document.visibilityState;
  if (state === 'visible') {
    broadcastOnPageVisible();
  }
}, false)

function broadcastOnPageVisible(): void {
  sendToCore({
    event: 'OnPageVisible',
    active: true,
    focused: true
  });
}
