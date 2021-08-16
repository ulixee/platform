const portsByTabId: { [tabId: number]: chrome.runtime.Port } = {};

let isDebugEnabled = false;
function enableDebugLogging(off = false) {
  isDebugEnabled = !off;
}

// @ts-ignore
window.enableDebugLogging = enableDebugLogging;

function logDebug(message: string, ...args: any[]) {
  if (isDebugEnabled) {
    console.log(message, ...args);
  }
}

chrome.runtime.onConnect.addListener(port => {
  const tabId = port.sender.tab.id;
  logDebug('OnConnect', tabId, port);
  portsByTabId[tabId] = port;
});

function getActiveTabs(windowId: number): Promise<chrome.tabs.Tab[]> {
  return new Promise<chrome.tabs.Tab[]>(resolve =>
    chrome.tabs.query({ active: true, windowId }, resolve),
  );
}

async function broadcastBounds(window: chrome.windows.Window) {
  const activeTabs = await getActiveTabs(window.id);
  const windowBounds = {
    windowId: window.id,
    left: window.left,
    top: window.top,
    width: window.width,
    height: window.height,
  };

  logDebug(`Window ${window.id} bounds changed to`, windowBounds);

  for (const tab of activeTabs) {
    const port = portsByTabId[tab.id];
    if (port) {
      port.postMessage({ windowBounds });
      return;
    }
  }
}

chrome.windows.onBoundsChanged.addListener(broadcastBounds);
chrome.windows.onCreated.addListener(broadcastBounds);

chrome.windows.onFocusChanged.addListener(async windowId => {
  logDebug(`Window focus changed to ${windowId}`);

  // don't update on blur for now (devtools and chromealive bar steal focus!)
  if (windowId === -1) return;

  const activeTabs = await getActiveTabs(windowId);
  for (const tab of activeTabs) {
    portsByTabId[tab.id]?.postMessage({ active: true });
  }
});
