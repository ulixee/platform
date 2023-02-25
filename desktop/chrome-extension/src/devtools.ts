/// <reference types="chrome"/>

// function handleShown() {
//   console.log("panel is being shown", chrome.devtools.inspectedWindow.tabId);
// }
//
// function handleHidden() {
//   console.log("panel is being hidden");
// }

window.addEventListener('message', event => {
  if (event.data.action === 'returnMinerAddress') {
    // @ts-expect-error
    window.minerAddress = event.data.minerAddress;
  }
});
window.parent?.postMessage({ action: 'getMinerAddress' });

chrome.devtools.panels.create('Hero Script', null, '/hero-script.html', extensionPanel => {
  let runOnce = false;
  extensionPanel.onShown.addListener(panelWindow => {
    if (runOnce) return;
    runOnce = true;
    // @ts-expect-error
    panelWindow.setMinerAddress(window.minerAddress);
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
    panelWindow.setMinerAddress(window.minerAddress);
  });
  // newPanel.onHidden.addListener(handleHidden);
  return null;
});
