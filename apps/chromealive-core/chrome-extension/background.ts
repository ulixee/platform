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
  try {
    port.onDisconnect.addListener(() => (portsByTabId[tabId] = null));
    port.postMessage({ tabId, windowId: port.sender.tab.windowId });
  } catch (e) {
    // nothing to do here
  }
});

async function postToTab(tabId: number, message: any, isRetry = false): Promise<boolean> {
  try {
    const port = await connectToTab(tabId);
    if (port) {
      port.postMessage(message);
      return true;
    }
  } catch (e) {
    if (String(e).match(/Attempting to use a disconnected port object/)) {
      portsByTabId[tabId] = null;
      if (!isRetry) return postToTab(tabId, message, true);
    }
    logDebug('Error connecting to tab', { tabId, e });
  }
  return false;
}

/////// FOCUSED WINDOW + BOUNDS ////////////////////////////////////////////////////////////////////////////////////////

function getActiveTabs(windowId: number): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ active: true, windowId });
}

async function broadcast(windowId: number, message: any): Promise<void> {
  logDebug(`Broadcasting to ${windowId}`, message);

  // don't update on blur for now (devtools and chromealive bar steal focus!)
  if (windowId === -1) return;

  const activeTabs = await getActiveTabs(windowId);
  for (const tab of activeTabs) {
    await postToTab(tab.id, message);
  }
}

async function broadcastBounds(window: chrome.windows.Window) {
  const message = {
    windowBounds: {
      windowId: window.id,
      left: window.left,
      top: window.top,
      width: window.width,
      height: window.height,
    },
  };

  const activeTabs = await getActiveTabs(window.id);
  for (const tab of activeTabs) {
    const didPost = await postToTab(tab.id, message);
    if (didPost) return;
  }
}

async function broadcastActive(windowId: number): Promise<void> {
  const message = { active: true, focused: true };

  if (windowId === -1) {
    const lastFocused = await chrome.windows.getLastFocused();
    windowId = lastFocused.id;
    message.focused = false;
  }
  return broadcast(windowId, message);
}

function broadcastGroupOpened(windowId: number): Promise<void> {
  return broadcast(windowId, { tabGroupOpened: true });
}

chrome.windows.onBoundsChanged.addListener(broadcastBounds);
chrome.windows.onCreated.addListener(broadcastBounds);

// active tab/window
chrome.windows.onCreated.addListener(async window => {
  if (window.focused) await broadcastActive(window.id);
});
chrome.windows.onFocusChanged.addListener(broadcastActive);
chrome.tabs.onActivated.addListener(tab => broadcastActive(tab.windowId));
chrome.tabGroups.onUpdated.addListener(group => {
  if (isCreatingGroup) return;
  if (group.collapsed === false) return broadcastGroupOpened(group.windowId);
});

/////// DEVTOOLS DRIVER ////////////////////////////////////////////////////////////////////////////////////////////////
let isCreatingGroup = false;
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

    isCreatingGroup = true;
    try {
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

      logDebug(
        `Updated group tabIds=${tabIds.join(',')}, windowId=${windowId}, groupId=${groupId}`,
      );
      await chrome.tabGroups.update(groupId, { title, color, collapsed });
      logDebug(`Updated group props=${message}`);

      return { groupId };
    } finally {
      setTimeout(() => (isCreatingGroup = false), 200);
    }
  },
  async ungroupTabs(message: { tabIds: number[] }): Promise<void> {
    logDebug(`Ungrouping tabIds=${message.tabIds?.join(',')}`);
    try {
      await chrome.tabs.ungroup(message.tabIds);
    } catch (err) {
      if (String(err).includes('Tabs cannot be edited right now')) {
        setTimeout(() => RuntimeActions.ungroupTabs(message), 100);
      }
    }
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug('chrome.runtime.onMessage', message);
  const fn = RuntimeActions[message.action];
  if (fn) {
    fn(message, sender)
      .catch(err => sendResponse(err))
      .then(result => {
        logDebug('chrome.runtime.onMessage:Result', { action: message.action, result });
        sendResponse(result);
        return true;
      })
      .catch(() => null);
    return true;
  }
  sendResponse({ success: false, reason: 'Unknown action', message });
  return true;
});
