/// <reference types="chrome"/>
import '@webcomponents/custom-elements';
import getCssSelector from 'css-selector-generator';
import { MessageEventType } from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import SelectorMenuElement from './lib/SelectorMenuElement';
import { onMessage, sendToDevtoolsScript } from './lib/content/ContentMessenger';
import ElementsBucket from './lib/ElementsBucket';

// @ts-ignore
window.getCssSelector = getCssSelector;

// Define the new element
customElements.define('chromealive-selector-menu', SelectorMenuElement);

let selectorMenuElem;
let selectorMenuIsOpen = false;

const elementsBucket = new ElementsBucket()

function openSelectorMenu(element) {
  selectorMenuIsOpen = true;
  if (!selectorMenuElem) {
    selectorMenuElem = document.createElement('chromealive-selector-menu');
    selectorMenuElem.attachElementsBucket(elementsBucket);
    document.body.appendChild(selectorMenuElem);
    document.body.addEventListener('click', closeSelectorMenu)
  }
  setTimeout(() => {
    if (selectorMenuIsOpen) {
      selectorMenuElem.show(element)
    }
  }, 0);
}

function closeSelectorMenu() {
  if (!selectorMenuElem || !selectorMenuIsOpen) return;
  selectorMenuIsOpen = false;
  selectorMenuElem.hide();
}

onMessage(payload => {
  const { event } = payload;
  if (event === MessageEventType.OverlayDispatched) {
    closeSelectorMenu();
  } else if (event === 'RunSelectorGenerator') {
    const selectors: string[] = [];
    // ToDo
    sendToDevtoolsScript({ event: 'FinishedSelectorGeneration', selectors });
  } else if (event === 'RunSelectorGenerator') {
    elementsBucket.reset();
  } else {
    console.log('UNHANDLED MESSAGE: ', payload);
  }
});

// @ts-ignore
window.openSelectorMenu = openSelectorMenu;
// @ts-ignore
window.onOverlayWasDispatched = closeSelectorMenu;

