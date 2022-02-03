/// <reference types="chrome"/>
import '@webcomponents/custom-elements';
import getCssSelector from 'css-selector-generator';
import { MessageEventType } from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import ElementOptionsOverlay from './lib/ElementOptionsOverlay';
import { onMessagePayload, sendToDevtoolsScript } from './lib/content/ContentMessenger';
import ElementsBucket from './lib/ElementsBucket';
import './lib/content/ContentListeners';
import findSelectors from './lib/content/findSelectors';

// @ts-ignore
window.getCssSelector = getCssSelector;

// Define the new element
customElements.define('chromealive-element-options-overlay', ElementOptionsOverlay);

let elementOptionsOverlay: ElementOptionsOverlay;
const elementsBucket = new ElementsBucket()

function openSelectorMenu({ backendNodeId, element }: { backendNodeId?: number, element?: HTMLElement }) {
  // if (!elementOptionsOverlay) {
  //   elementOptionsOverlay = document.createElement('chromealive-element-options-overlay') as ElementOptionsOverlay;
  //   elementOptionsOverlay.attachElementsBucket(elementsBucket);
  //   document.body.appendChild(elementOptionsOverlay);
  //   document.body.addEventListener('click', closeSelectorMenu);
  // }
  // element ??= elementsBucket.getByKey(backendNodeId);
  // if (element && backendNodeId) {
  //   elementOptionsOverlay.open(backendNodeId, element)
  // } else if (backendNodeId) {
  //   elementOptionsOverlay.openByBackendNodeId(backendNodeId);
  // }
}

function closeSelectorMenu() {
  if (!elementOptionsOverlay) return;
  elementOptionsOverlay.close();
}

function tmpHideSelectorMenu(value: boolean) {
  if (!elementOptionsOverlay) return;
  elementOptionsOverlay.tmpHide(value);
}

onMessagePayload(async payload => {
  const { event, backendNodeId } = payload;
  if (event === MessageEventType.InspectElementModeChanged) {
    if (payload.isOn) {
      closeSelectorMenu();
    }

  } else if (event === MessageEventType.OpenElementOptionsOverlay) {
    console.log(payload);
    openSelectorMenu({ backendNodeId });

  } else if (event === MessageEventType.HideElementOptionsOverlay) {
    tmpHideSelectorMenu(true);

  } else if (event === MessageEventType.RemoveHideFromElementOptionsOverlay) {
    tmpHideSelectorMenu(false);

  } else if (event === MessageEventType.CloseElementOptionsOverlay) {
    closeSelectorMenu();

  } else if (event === MessageEventType.UpdateElementOptions) {
    if ('isIncluded' in payload) {
      if (payload.isIncluded) {
        const element = await elementsBucket.getByBackendNodeId(backendNodeId)
        elementsBucket.addIncludedElement(backendNodeId, element);
      } else {
        elementsBucket.removeIncludedElement(backendNodeId);
      }
    } else if ('isExcluded' in payload) {
      if (payload.isExcluded) {
        const element = await elementsBucket.getByBackendNodeId(backendNodeId)
        elementsBucket.addExcludedElement(backendNodeId, element);
      } else {
        elementsBucket.removeExcludedElement(backendNodeId);
      }
    }
  } else if (event === MessageEventType.RunSelectorGenerator) {
    // const selectors: string[] = [];
    const element = elementsBucket.includedElements[0];
    const selectors: string[][] = findSelectors(element).map(x => x.split(' '));
    sendToDevtoolsScript({ event: MessageEventType.FinishedSelectorGeneration, selectors });

  } else if (event === MessageEventType.ResetSelectorGenerator) {
    elementsBucket.reset();

  } else {
    console.log('UNHANDLED MESSAGE: ', payload);
  }
});
