declare let window: Window;

function onPageVisible(): void {
  // @ts-ignore
  if (window.___onPageVisible) window.___onPageVisible('');
}

function onBoundsChanged(bounds: {
  windowId: number;
  left: number;
  top: number;
  width: number;
  height: number;
}): void {
  // @ts-ignore
  if (window.___onBoundsChanged) window.___onBoundsChanged(JSON.stringify(bounds));
}

function onTabIdentify(id: { tabId: number; windowId: number }): void {
  // @ts-ignore
  if (window.___onTabIdentify) window.___onTabIdentify(JSON.stringify(id));
}

function onMessage(message) {
  if ('active' in message) {
    onPageVisible();
  } else if ('windowBounds' in message) {
    onBoundsChanged(message.windowBounds);
  } else if ('tabId' in message) {
    onTabIdentify(message);
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
