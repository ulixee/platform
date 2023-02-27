/// <reference types="chrome"/>

// function handleShown() {
//   console.log("panel is being shown", chrome.devtools.inspectedWindow.tabId);
// }
//
// function handleHidden() {
//   console.log("panel is being hidden");
// }

window.addEventListener('message', event => {
  if (event.data.action === 'returnCloudAddress') {
    // @ts-expect-error
    window.cloudAddress = event.data.cloudAddress;
  }
});
window.parent?.postMessage({ action: 'getCloudAddress' });

chrome.devtools.panels.create('Hero Script', null, '/hero-script.html', extensionPanel => {
  let runOnce = false;
  extensionPanel.onShown.addListener(panelWindow => {
    if (runOnce) return;
    runOnce = true;
    // @ts-expect-error
    panelWindow.setCloudAddress(window.cloudAddress);
  });
  // newPanel.onHidden.addListener(handleHidden);
  return null;
});

chrome.devtools.panels.create('State Generator', null, '/state-generator.html', extensionPanel => {
  let runOnce = false;
  extensionPanel.onShown.addListener(panelWindow => {
    if (runOnce) return;
    runOnce = true;
    // @ts-expect-error
    panelWindow.setCloudAddress(window.cloudAddress);
  });
  // newPanel.onHidden.addListener(handleHidden);
  return null;
});
