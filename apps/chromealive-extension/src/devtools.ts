/// <reference types="chrome"/>

// function handleShown() {
//   console.log("panel is being shown", chrome.devtools.inspectedWindow.tabId);
// }
//
// function handleHidden() {
//   console.log("panel is being hidden");
// }

chrome.devtools.panels.create(
  'Hero Script',
  null,
  "/hero-script.html",
  () => {
    // newPanel.onShown.addListener(handleShown);
    // newPanel.onHidden.addListener(handleHidden);
    return null;
  }
);

chrome.devtools.panels.create(
  'State Generator',
  null,
  "/state-generator.html",
  () => {
    // newPanel.onShown.addListener(handleShown);
    // newPanel.onHidden.addListener(handleHidden);
    return null;
  }
);
