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

chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  chrome.devtools.inspectedWindow.eval("openSelectorMenu($0)", { useContentScriptContext: true });
});

// self.chrome.devtools.panels
/*
let elements = await import('./elements/elements.js');
elements.ElementsTreeElementHighlighter.ElementsTreeElementHighlighter.prototype._highlightNode
 */


/*
// tells you when hover is on
let elements = await import('./elements/elements.js');
let setHoverEffect2 = elements.ElementsTreeOutline.ElementsTreeOutline.prototype.setHoverEffect;
elements.ElementsTreeOutline.ElementsTreeOutline.prototype.setHoverEffect = function(x) {
  console.log('setHoverEffect: ', x);
  setHoverEffect2.call(this, x);
}
 */
