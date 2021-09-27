declare let window: Window;

function onPageVisible(isFocused = true): void {
  // @ts-ignore
  if (window.___onPageVisible) window.___onPageVisible(JSON.stringify({ focused: isFocused }));
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

function onTabGroupOpened(): void {
  // @ts-ignore
  if (window.___onTabGroupOpened) window.___onTabGroupOpened('');
}

function onMessage(message) {
  if ('active' in message) {
    onPageVisible(message.focused);
  } else if ('tabGroupOpened' in message) {
    onTabGroupOpened();
  } else if ('windowBounds' in message) {
    onBoundsChanged(message.windowBounds);
  } else if ('tabId' in message) {
    onTabIdentify(message);
  }
}

let activePort: chrome.runtime.Port;
chrome.runtime.onConnect.addListener(onConnected);

function onConnected(port: chrome.runtime.Port) {
  activePort = port;
  activePort.onDisconnect.addListener(() => {
    activePort.onMessage.removeListener(onMessage);
    activePort = null;
    setTimeout(connect, 1e3);
  });
  activePort.onMessage.addListener(onMessage);
}

function connect() {
  try {
    if (activePort) return;
    const port = chrome.runtime.connect();
    onConnected(port);
  } catch (err) {
    console.error('Error connecting to service worker', err);
    setTimeout(connect, 5e3);
  }
}

connect();
