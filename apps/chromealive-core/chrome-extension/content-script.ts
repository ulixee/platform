function onMessage(message) {
  // @ts-ignore
  const onPageVisible = window.___onPageVisible;
  if (onPageVisible && message.active) {
    onPageVisible('');
  }
  // @ts-ignore
  const onBoundsChanged = window.___onBoundsChanged;
  if (onBoundsChanged && message.windowBounds) {
    onBoundsChanged(JSON.stringify(message.windowBounds));
  }
}
function connect() {
  const port = chrome.runtime.connect();
  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(onMessage);
    setTimeout(connect, 1e3);
  });
  port.onMessage.addListener(onMessage);
}

connect();
