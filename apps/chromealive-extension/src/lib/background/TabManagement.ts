import logDebug from '../logDebug';

let creatingTabGroup = false;
let hiddenGroupId: number;
const visibleTabIds = new Set<number>();
const hiddenTabIds = new Set<number>();
const isStarted = createHiddenGroup().catch(error =>
  console.error('Error creating hidden group', error),
);
// @ts-expect-error
self.details = {
  visibleTabIds,
  hiddenTabIds,
  creatingTabGroup,
};

export async function hideTabs(payload: { showTabIds: number[] }): Promise<void> {
  const { showTabIds } = payload;
  await isStarted;

  const existingTabs = await chrome.tabs.query({});
  visibleTabIds.clear();
  hiddenTabIds.clear();

  for (const tab of existingTabs) {
    if (showTabIds.includes(tab.id)) {
      visibleTabIds.add(tab.id);
    } else {
      hiddenTabIds.add(tab.id);
    }
  }

  if (!hiddenGroupId) {
    await createTabGroup([...hiddenTabIds]);
  }

  logDebug('Grouped tabs at ' + new Date().toISOString(), {
    hiddenGroupId,
    hiddenTabIds: Array.from(hiddenTabIds),
    visibleTabs: [...visibleTabIds],
  });

  await chrome.tabs.group({
    groupId: hiddenGroupId,
    tabIds: Array.from(hiddenTabIds),
  });

  if (visibleTabIds.size) {
    for (const tab of existingTabs) {
      if (!visibleTabIds.has(tab.id)) continue;
      logDebug('Activate tab', tab);
      if (tab.groupId) {
        await chrome.tabs.ungroup(tab.id);
      }
      if (!tab.active) {
        await chrome.tabs.update(tab.id, { active: true });
      }
    }
  }
}

// LISTENERS ///////////////////////////////////////////////////////////////////////////////////////

chrome.tabGroups.onMoved.addListener(() => {
  if (creatingTabGroup) return;
  moveHiddenGroupToLeft(hiddenGroupId);
});

chrome.tabGroups.onUpdated.addListener(async group => {
  if (creatingTabGroup) return;
  if (group.id === hiddenGroupId && !group.collapsed) {
    await delay();
    collapseHiddenGroup(group.id);
    moveHiddenGroupToLeft(hiddenGroupId);
  }
});

chrome.tabGroups.onRemoved.addListener(async tabGroup => {
  if (tabGroup.id !== hiddenGroupId) return;
  await delay();
  await createHiddenGroup();
});

chrome.tabs.onRemoved.addListener(tabId => {
  hiddenTabIds.delete(tabId);
  visibleTabIds.delete(tabId);
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  if (moveInfo.toIndex === 0) {
    setTimeout(() => moveHiddenGroupToLeft(hiddenGroupId), 50);
  }
});

// PRIVATE /////////////////////////////////////////////////////////////////////////////////////////

let isMovingHiddenGroup = false;
function moveHiddenGroupToLeft(groupId: number, retryNumber = 0) {
  if (!groupId) return;
  if (isMovingHiddenGroup && !retryNumber) return;
  isMovingHiddenGroup = true;
  chrome.tabGroups
    .move(groupId, { index: 0 })
    .then(() => (isMovingHiddenGroup = false))
    .catch(err => {
      if (retryNumber > 10) throw err;
      isMovingHiddenGroup = false;
      setTimeout(() => moveHiddenGroupToLeft(groupId, retryNumber + 1), 50);
    });
}

let isCollapsingHiddenGroup = false;
function collapseHiddenGroup(groupId, retryNumber = 0) {
  if (!groupId) return;
  if (isCollapsingHiddenGroup && !retryNumber) return;
  isCollapsingHiddenGroup = true;

  chrome.tabGroups
    .update(groupId, { collapsed: true })
    .then(() => (isCollapsingHiddenGroup = false))
    .catch(err => {
      if (retryNumber > 10) throw err;
      isCollapsingHiddenGroup = false;
      setTimeout(() => collapseHiddenGroup(groupId, retryNumber + 1), 50);
    });
}

// CREATE GROUP /////////////////////////////////////////////////////////////////////////////////////////

async function createHiddenGroup(): Promise<void> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (hiddenGroupId === undefined) {
    const hiddenGroups = await chrome.tabGroups.query({ collapsed: true });
    if (hiddenGroups.length) {
      hiddenGroupId = hiddenGroups[0].id;
      for (const tab of tabs) {
        if (tab.groupId === hiddenGroupId) hiddenTabIds.add(tab.id);
        else visibleTabIds.add(tab.id);
      }
      return;
    }
  }

  hiddenTabIds.clear();
  visibleTabIds.clear();
  // window opens with one or more tabs that should remain shown
  for (const existingTab of tabs) {
    if (!existingTab.active) {
      hiddenTabIds.add(existingTab.id);
    } else {
      visibleTabIds.add(existingTab.id);
    }
  }

  // tabGroup must have at least 1 tab so we create one if needed
  if (!hiddenTabIds.size) {
    return;
  }

  await createTabGroup([...hiddenTabIds]);

  for (const tab of tabs) {
    if (visibleTabIds.has(tab.id)) {
      if (!tab.active) {
        await chrome.tabs.update(tab.id, { active: true });
        const window = await chrome.windows.getCurrent();
        if (!window?.focused) {
          await chrome.windows.update(window.id, { focused: true });
        }
      }
      break;
    }
  }
}

async function createTabGroup(tabIds: number[]): Promise<void> {
  try {
    creatingTabGroup = true;
    if (!hiddenGroupId) {
      hiddenGroupId = await chrome.tabs.group({
        tabIds,
      });
      await delay();
    }
    await chrome.tabGroups.update(hiddenGroupId, { color: 'grey', collapsed: true, title: '' });
    logDebug(`Created tab group. TabIds=${tabIds.join(',')}, groupId=${hiddenGroupId}`);
  } catch (err) {
    console.error('ERROR updating tab group', err);
    await delay();
    return createTabGroup(tabIds);
  } finally {
    creatingTabGroup = false;
  }
}

function delay(ms = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
