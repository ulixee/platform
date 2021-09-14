/////// LOGGING ////////////////////////////////////////////////////////////////////////////////////////////////////////

let isDebugEnabled = true;
function enableDebugLogging(off = false) {
  isDebugEnabled = !off;
}

// @ts-ignore
// eslint-disable-next-line no-restricted-globals
self.enableDebugLogging = enableDebugLogging;

function logDebug(message: string, ...args: any[]) {
  if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
}

/////// CONNECTIONS TO TABS ////////////////////////////////////////////////////////////////////////////////////////////

const portsByTabId: { [tabId: number]: chrome.runtime.Port } = {};
function connectToTab(tabId: number): chrome.runtime.Port {
  try {
    portsByTabId[tabId] ??= chrome.tabs.connect(tabId, { frameId: 0 });
  } catch (err) {
    portsByTabId[tabId] = null;
  }
  return portsByTabId[tabId];
}

chrome.runtime.onConnect.addListener(port => {
  const tabId = port.sender.tab.id;
  logDebug('OnConnect', tabId, port);
  portsByTabId[tabId] = port;
  port.postMessage({ tabId, windowId: port.sender.tab.windowId });
  port.onDisconnect.addListener(() => (portsByTabId[tabId] = null));
});

/////// FOCUSED WINDOW + BOUNDS ////////////////////////////////////////////////////////////////////////////////////////

function getActiveTabs(windowId: number): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ active: true, windowId });
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
    const port = await connectToTab(tab.id);
    if (port) {
      port.postMessage({ windowBounds });
      return;
    }
  }
}

async function broadcastActive(windowId: number) {
  logDebug(`Window focus changed to ${windowId}`);

  // don't update on blur for now (devtools and chromealive bar steal focus!)
  if (windowId === -1) return;

  const activeTabs = await getActiveTabs(windowId);
  for (const tab of activeTabs) {
    const port = await connectToTab(tab.id);
    port?.postMessage({ active: true });
  }
}

chrome.windows.onBoundsChanged.addListener(broadcastBounds);
chrome.windows.onCreated.addListener(broadcastBounds);
chrome.windows.onCreated.addListener(async window => {
  if (window.focused) await broadcastActive(window.id);
});
chrome.windows.onFocusChanged.addListener(broadcastActive);

/////// DEVTOOLS DRIVER ////////////////////////////////////////////////////////////////////////////////////////////////

const RuntimeActions = {
  identify(
    message: any,
    sender: chrome.runtime.MessageSender,
  ): Promise<{ tabId: number; windowId: number }> {
    return Promise.resolve({ tabId: sender.tab.id, windowId: sender.tab.windowId });
  },
  async groupTabs(message: {
    tabIds: number[];
    collapsed: boolean;
    windowId: number;
    title: string;
    color: chrome.tabGroups.ColorEnum;
  }): Promise<{ groupId: number }> {
    const { windowId, tabIds, title, color, collapsed } = message;
    const matchingGroups = await new Promise<chrome.tabGroups.TabGroup[]>(resolve =>
      chrome.tabGroups.query({ windowId, title }, resolve),
    );

    let groupId = matchingGroups[0]?.id;
    if (groupId) {
      await chrome.tabs.group({
        groupId,
        tabIds,
      });
    } else {
      groupId = await chrome.tabs.group({
        createProperties: {
          windowId,
        },
        tabIds,
      });
    }

    logDebug(`Updated group tabIds=${tabIds.join(',')}, windowId=${windowId}, groupId=${groupId}`);
    await chrome.tabGroups.update(groupId, { title, color, collapsed });
    logDebug(`Updated group props=${message}`);

    return { groupId };
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug('chrome.runtime.onMessage', message);
  const fn = RuntimeActions[message.action];
  if (fn) {
    fn(message, sender)
      .then(result => {
        logDebug('chrome.runtime.onMessage:Result', { action: message.action, result });
        sendResponse(result);
        return true;
      })
      .catch(err => sendResponse(err));
    return true;
  }
  sendResponse({ success: false, reason: 'Unknown action', message });
});
