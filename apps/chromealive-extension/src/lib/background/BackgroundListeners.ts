import { sendToCore } from './BackgroundMessenger';

// WINDOW BOUNDS //////////////////////////////////////////////////////////////////////////////

chrome.windows.onBoundsChanged.addListener(broadcastOnWindowBounds);
chrome.windows.onCreated.addListener(broadcastOnWindowBounds);

function broadcastOnWindowBounds(window: chrome.windows.Window) {
  sendToCore({
    event: 'OnWindowBounds',
    windowId: window.id,
    windowBounds: {
      left: window.left,
      top: window.top,
      width: window.width,
      height: window.height,
    },
  });
}

// PAGE VISIBLE //////////////////////////////////////////////////////////////////////////////

chrome.windows.onCreated.addListener(async window => {
  if (window.focused) await broadcastOnPageVisible(window.id);
});
chrome.windows.onFocusChanged.addListener(windowId => broadcastOnPageVisible(windowId));
chrome.tabs.onActivated.addListener(tab => broadcastOnPageVisible(tab.windowId));

async function broadcastOnPageVisible(windowId: number): Promise<void> {
  const message = { event: 'OnPageVisible', active: true, focused: true };

  if (windowId === -1) {
    const lastWindowFocused = await chrome.windows.getLastFocused();
    windowId = lastWindowFocused.id;
    message.focused = false;
  }

  sendToCore({
    event: 'OnPageVisible',
    windowId,
    ...message,
  });
}
