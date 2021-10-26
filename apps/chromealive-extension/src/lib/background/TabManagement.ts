import logDebug from '../logDebug';

let creatingTabGroup = false;

export function isCreatingTabGroup() {
  return creatingTabGroup;
}

export async function groupTabs(payload: {
  tabIds: number[];
  collapsed: boolean;
  windowId: number;
  title: string;
  color: chrome.tabGroups.ColorEnum;
}): Promise<{ groupId: number }> {
  const { windowId, tabIds, title, color, collapsed } = payload;
  const matchingGroups = await new Promise<chrome.tabGroups.TabGroup[]>(resolve =>
    chrome.tabGroups.query({ windowId, title }, resolve),
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

    await chrome.tabGroups.update(groupId, { title, color, collapsed });
    logDebug(`Updated group props=${JSON.stringify({ title, color, collapsed })}`);

    return { groupId };
  } finally {
    setTimeout(() => (creatingTabGroup = false), 200);
  }
}

export async function ungroupTabs(message: { tabIds: number[] }): Promise<void> {
  logDebug(`Ungrouping tabIds=${message.tabIds?.join(',')}`);
  try {
    await chrome.tabs.ungroup(message.tabIds);
  } catch (err) {
    if (String(err).includes('Tabs cannot be edited right now')) {
      setTimeout(() => ungroupTabs(message), 100);
    }
  }
}
