import logDebug from '../logDebug';

let creatingTabGroup = false;

let hiddenGroupId: number;
const visibleTabIds: Set<number> = new Set();
const hiddenTabIds: Set<number> = new Set();

export async function hideTabs(payload: { showTabIds: number[], onlyHideTabIds: number[] }): Promise<void> {
  const { showTabIds, onlyHideTabIds } = payload;
  const currentWindow = await chrome.windows.getCurrent();
  const existingTabs = await chrome.tabs.query({ windowId: currentWindow.id });
  let activeTabWasHidden = false;

  for (const tab of existingTabs) {
    if (showTabIds.includes(tab.id)) {
      visibleTabIds.add(tab.id);
      hiddenTabIds.delete(tab.id);
    } else if (!onlyHideTabIds.length || onlyHideTabIds.includes(tab.id)) {
      if (tab.active) {
        activeTabWasHidden = true;
      }
      visibleTabIds.delete(tab.id);
      hiddenTabIds.add(tab.id);
    }
  }

  await chrome.tabs.group({
    groupId: hiddenGroupId,
    tabIds: Array.from(hiddenTabIds)
  });

  if (visibleTabIds.size) {
    const tabIds = Array.from(visibleTabIds);
    await chrome.tabs.ungroup(tabIds);
    if (activeTabWasHidden) {
      await chrome.tabs.update(tabIds[0], { active: true });
    }
  }
}

export function isCreatingTabGroup() {
  return creatingTabGroup;
}

async function groupTabs(payload: {
  tabIds: number[];
  collapsed: boolean;
  windowId: number;
  color: chrome.tabGroups.ColorEnum;
}): Promise<{ groupId: number }> {
  const { windowId, tabIds, color, collapsed } = payload;
  const matchingGroups = await new Promise<chrome.tabGroups.TabGroup[]>(resolve =>
    chrome.tabGroups.query({ windowId }, resolve),
  );

  creatingTabGroup = true;
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    logDebug(`Updated group tabIds=${tabIds.join(',')}, windowId=${windowId}, groupId=${groupId}`);

    await moveHiddenGroupToLeft(groupId);
    await chrome.tabGroups.update(groupId, { color, collapsed, title: '' });
    logDebug(`Updated group props=${JSON.stringify({ color, collapsed })}`);

    return { groupId };
  } catch (err) {
    console.error('ERROR updating tab group', err);
    setTimeout(() => groupTabs(payload), 100);
  } finally {
    setTimeout(() => (creatingTabGroup = false), 200);
  }
}

// LISTENERS ///////////////////////////////////////////////////////////////////////////////////////

chrome.tabGroups.onMoved.addListener(group => {
  moveHiddenGroupToLeft(hiddenGroupId);
});

chrome.tabGroups.onUpdated.addListener(group => {
  if (creatingTabGroup) return;
  if (group.id === hiddenGroupId && !group.collapsed) {
    collapseHiddenGroup(group.id);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (hiddenTabIds.has(tabId)) {
    const activeTabId = Array.from(visibleTabIds)[0];
    await activateTab(activeTabId);
  }
});

chrome.tabGroups.onRemoved.addListener(async (tabGroup) => {
  if (tabGroup.id !== hiddenGroupId) return;
  await createHiddenGroup();
});

chrome.tabs.onMoved.addListener(group => {
  moveHiddenGroupToLeft(hiddenGroupId);
});

// PRIVATE /////////////////////////////////////////////////////////////////////////////////////////

let isMovingHiddenGroup = false;
function moveHiddenGroupToLeft(groupId: number, isRetry = false) {
  if (isMovingHiddenGroup && !isRetry) return;
  isMovingHiddenGroup = true;
  chrome.tabGroups.move(groupId, { index: 0 })
    .then(() => isMovingHiddenGroup = false)
    .catch(() => {
      setTimeout(() => moveHiddenGroupToLeft(groupId, true), 50);
    });
}

let isCollapsingHiddenGroup = false;
function collapseHiddenGroup(groupId, isRetry = false) {
  if (isMovingHiddenGroup && !isRetry) return;
  isCollapsingHiddenGroup = true;

  chrome.tabGroups.update(groupId, { collapsed: true })
    .then(() => isCollapsingHiddenGroup = false)
    .catch(() => {
      setTimeout(() => collapseHiddenGroup(groupId, true), 50);
    });
}

let isActivatingTab = false;
function activateTab(tabId: number, isRetry = false) {
  if (isActivatingTab && !isRetry) return;
  isActivatingTab = true;

  chrome.tabs.update(tabId, { active: true })
    .then(() => isActivatingTab = false)
    .catch(() => {
      setTimeout(() => activateTab(tabId, true), 50);
    });
}

//

async function createHiddenGroup() {
  for (const tabId of visibleTabIds.values()) {
    try {
      await chrome.tabs.get(tabId);
    } catch(error) {
      visibleTabIds.delete(tabId);
    }
  }
  for (const tabId of hiddenTabIds.values()) {
    try {
      await chrome.tabs.get(tabId);
    } catch (error) {
      hiddenTabIds.delete(tabId);
    }
  }
  const currentWindow = await chrome.windows.getCurrent();
  // window opens with one or more tabs that should remain shown
  const existingTabs = await chrome.tabs.query({ windowId: currentWindow.id });
  for (const existingTab of existingTabs) {
    if (hiddenTabIds.has(existingTab.id)) {
      continue;
    } else if (!hiddenTabIds.size && existingTab.url === 'about:blank') {
      hiddenTabIds.add(existingTab.id)
    }
    visibleTabIds.add(existingTab.id);
  }

  // tabGroup must have at least 1 tab so we create one if needed
  if (!hiddenTabIds.size) {
    const newTab = await chrome.tabs.create({
      url: 'chrome://newtab/',
      index: 0,
      selected: false,
      active: false,
    });
    hiddenTabIds.add(newTab.id)
  }

  const hiddenTabIdsArray = Array.from(hiddenTabIds);
  const { groupId } = await groupTabs({
    tabIds: hiddenTabIdsArray,
    collapsed: true,
    windowId: currentWindow.id,
    color: 'grey',
  });
  hiddenGroupId = groupId;
}

createHiddenGroup().catch(error => console.log(error));
