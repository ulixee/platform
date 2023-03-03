/// <reference types="chrome"/>

window.addEventListener('message', event => {
  if (event.data.action === 'returnCloudAddress') {
    // @ts-expect-error
    window.cloudAddress = event.data.cloudAddress;
  }
});

window.parent?.postMessage({ action: 'getCloudAddress' });

function onPanel(extensionPanel) {
  let runOnce = false;
  extensionPanel.onShown.addListener(panelWindow => {
    if (runOnce) return;
    runOnce = true;
    // @ts-expect-error
    panelWindow.setCloudAddress(window.cloudAddress);
  });
  return null;
}

chrome.devtools.panels.create('Hero Script', '/img/logo.svg', '/extension/hero-script.html', onPanel);
chrome.devtools.panels.create('Resources', '/img/resource.svg', '/extension/resources.html', onPanel);
chrome.devtools.panels.create('State Generator', '/img/element.svg', '/extension/state-generator.html', onPanel);
