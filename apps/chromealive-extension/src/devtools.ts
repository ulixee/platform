/// <reference types="chrome"/>

function handleShown() {
  console.log("panel is being shown", chrome.devtools.inspectedWindow.tabId);
}

function handleHidden() {
  console.log("panel is being hidden");
}

chrome.devtools.panels.create(
  'Selector Generator',
  null,
  "/selector-generator.html",
  newPanel => {
    newPanel.onShown.addListener(handleShown);
    newPanel.onHidden.addListener(handleHidden);
    return null;
  }
);
