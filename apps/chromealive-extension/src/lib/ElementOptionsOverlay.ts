import {
  MessageEventType,
  ___sendToCore,
  IMessageObject,
  MessageLocation,
  packMessage,
  ResponseCode
} from '@ulixee/apps-chromealive-core/lib/BridgeHelpers';
import ElementsBucket from './ElementsBucket';

export default class ElementOptionsOverlay extends HTMLElement {
  public hasStartedInitialization = false;
  public hasFinishedInitialization = false;
  public elementsBucket: ElementsBucket;

  private isOpen = false;
  private isTmpHidden = false;

  private selectedElem: HTMLElement;
  private selectedBackendNodeId: number;

  private titleNameElem: HTMLElement;
  private positionElem: HTMLElement;

  private highlightElem: HTMLElement;
  private overlayElem: HTMLElement;

  private mustIncludeToggle: HTMLElement;
  private mustExcludeToggle: HTMLElement;

  public attachElementsBucket(elementsBucket: ElementsBucket) {
    this.elementsBucket = elementsBucket;
  }

  public openByBackendNodeId(backendNodeId: number) {
    this.elementsBucket.getByBackendNodeId(backendNodeId)
      .then(element => this.open(backendNodeId, element))
      .catch(error => {
        console.log(`ERROR: Could not fetch element for backendNodeId: ${backendNodeId}`, error);
      });
  }

  public open(backendNodeId: number, element: HTMLElement) {
    if (!this.hasFinishedInitialization) {
      this.hasFinishedInitialization = true;
      return setTimeout(() => {
        this.open(backendNodeId, element);
      });
    }

    this.selectedElem = element;
    this.selectedBackendNodeId = backendNodeId;
    if (!element) return;

    const tagName = element.localName;
    const classes = Array.from(element.classList);
    const titleText = [`<span class="tag">${tagName}</span>`, ...classes].join('.');

    const { width, height, top, left } = element.getBoundingClientRect();
    const absLeft = left + window.scrollX;
    const absTop = top + window.scrollY;

    const positionText = `${Math.round(width * 100)/100} x ${Math.round(height * 100)/100}`;

    this.isOpen = true;
    this.style.left = `${absLeft}px`;
    this.style.top = `${absTop}px`;
    this.style.width = `${width}px`;
    this.style.height = `${height}px`;

    this.titleNameElem.innerHTML = titleText;
    this.positionElem.textContent = positionText;
    this.style.display = 'block';

    const overlayHeight = this.overlayElem.offsetHeight;

    if (top - overlayHeight < 0) {
      this.overlayElem.classList.remove('top');
      this.overlayElem.classList.add('bottom');
    } else {
      this.overlayElem.classList.remove('bottom');
      this.overlayElem.classList.add('top');
    }

    if (this.elementsBucket.isIncludedBackendNodeId(this.selectedBackendNodeId)) {
      this.addOnClassToIncludeToggle();
    } else {
      this.addOffClassToIncludeToggle();
    }

    if (this.elementsBucket.isExcludedBackendNodeId(this.selectedBackendNodeId)) {
      this.addOnClassToExcludeToggle();
    } else {
      this.addOffClassToExcludeToggle();
    }
  }

  public tmpHide(value: boolean) {
    if (!this.isOpen) return;
    if (value === true) {
      this.isTmpHidden = true;
      this.style.display = 'none';
    } else if (this.isTmpHidden) {
      this.isTmpHidden = false;
      this.style.display = 'block';
    }
  }

  public close() {
    this.isOpen = false;
    this.isTmpHidden = false;
    this.style.display = 'none';
  }

  // PRIVATE ///////////////////////////////////////////////////////////////////

  private addOffClassToIncludeToggle() {
    this.mustIncludeToggle.classList.remove('on');
    this.mustIncludeToggle.classList.add('off');
  }

  private addOnClassToIncludeToggle() {
    this.mustIncludeToggle.classList.remove('off');
    this.mustIncludeToggle.classList.add('on');
    this.addOffClassToExcludeToggle();
  }

  private addOnClassToExcludeToggle() {
    this.mustExcludeToggle.classList.add('on');
    this.mustExcludeToggle.classList.remove('off');
    this.addOffClassToIncludeToggle();
  }

  private addOffClassToExcludeToggle() {
    this.mustExcludeToggle.classList.add('off');
    this.mustExcludeToggle.classList.remove('on');

  }

  private toggleIncluded() {
    openSelectorGeneratorPanel();
    const isIncluded = this.elementsBucket.isIncludedBackendNodeId(this.selectedBackendNodeId);
    if (isIncluded) {
      this.elementsBucket.removeIncludedElement(this.selectedBackendNodeId);
      this.addOffClassToIncludeToggle();
    } else {
      this.elementsBucket.addIncludedElement(this.selectedBackendNodeId, this.selectedElem);
      this.addOnClassToIncludeToggle();
    }
  }

  private toggleMustExclude() {
    openSelectorGeneratorPanel();
    const isExcluded = this.elementsBucket.isExcludedBackendNodeId(this.selectedBackendNodeId);
    if (isExcluded) {
      this.elementsBucket.removeExcludedElement(this.selectedBackendNodeId);
      this.addOffClassToExcludeToggle();
    } else {
      this.elementsBucket.addExcludedElement(this.selectedBackendNodeId, this.selectedElem);
      this.addOnClassToExcludeToggle();
    }
  }

  private initialize() {
    this.style.position = 'absolute';
    this.style.zIndex = '2147483647';

    this.attachShadow({ mode: 'open' });
    this.createStyleElem();
    this.createHighlighterElem();
    this.createOverlayElem();

    this.shadowRoot.addEventListener('click', event => {
      event.cancelBubble = true;
    });
  }

  private createOverlayElem() {
    const triangleWidth = 15;
    const overlayElem = document.createElement('div');
    overlayElem.setAttribute('class', 'overlay');
    overlayElem.innerHTML = `
      <div class="overlay-panel">
        <div class="title">
          <div class="name">------</div>
          <div class="position"></div>
        </div>
        <div class="controller">
          <div class="intro">Selector Generator Options:</div>
          <div class="option must-include">
            <div class="symbol plus"></div>
            <label>Must Include</label>
            <div id="must-include" class="toggle-component">
              <span class="label off">OFF</span>
              <span class="label on">ON</span>
              <div class="toggle"></div>
            </div>
          </div>
          <div class="option must-exclude">
            <div class="symbol minus"></div>
            <label>Must Exclude</label>
            <div id="must-exclude" class="toggle-component">
              <span class="label off">OFF</span>
              <span class="label on">ON</span>
              <div class="toggle"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="overlay-triangle" style="width: ${(Math.sqrt(2)*triangleWidth)+5}px; height: ${(Math.sqrt(2)*(triangleWidth/2))+5}px">
        <div style="width: ${triangleWidth}px; height: ${triangleWidth}px"></div>
      </div>
    `;

    this.mustIncludeToggle = overlayElem.querySelector('div#must-include');
    this.mustIncludeToggle.addEventListener('click', event => {
      this.toggleIncluded();
      event.cancelBubble = true;
    });

    this.mustExcludeToggle = overlayElem.querySelector('div#must-exclude');
    this.mustExcludeToggle.addEventListener('click', event => {
      this.toggleMustExclude();
      event.cancelBubble = true;
    });

    this.overlayElem = overlayElem;
    this.titleNameElem = overlayElem.querySelector('.title .name');
    this.positionElem = overlayElem.querySelector('.title .position');

    this.shadowRoot.appendChild(overlayElem);
  }

  private createHighlighterElem() {
    if (this.highlightElem) return;
    this.highlightElem = document.createElement('div');
    this.highlightElem.setAttribute('class', 'highlighter');
    this.shadowRoot.appendChild(this.highlightElem);
  }

  private createStyleElem() {
    const css = `
      .highlighter {
        background: rgba(91, 150, 202, 0.5);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      }
      .overlay {
        position: absolute;
        z-index: 2;
      }      
      .overlay-panel {
        position: relative;
        left: 0;
        bottom: 0;
        z-index: 2;
        background: white;
        padding: 5px 10px;
        border-radius: 4px;
        box-shadow: 1px 1px 8px 0 rgb(0 0 0 / 40%);
        min-width: 290px;
        max-width: 390px;
      }
      
      .overlay-triangle {
        position: absolute;
        overflow: hidden;
      }
      .overlay-triangle div {
        position: absolute;
        transform: rotate(45deg);
        height: 15px;
        width: 15px;
        pointer-events: none;
        background: #ffffff;
        box-shadow: 1px 1px 8px 0 rgb(0 0 0 / 40%);
      }
      
      .overlay.top {
        left: 0;
        bottom: calc(100% + 8px);
      }
      .overlay.top .overlay-triangle {
        left: 15px;
        top: 100%;
        z-index: 2;
      }
      .overlay.top .overlay-triangle div {
        top: -7px;
        left: 5px;
      }
      
      .overlay.bottom {
        left: 0;
        top: calc(100% + 8px);
      }
      .overlay.bottom .overlay-triangle {
        left: 15px;
        top: -15px;
        z-index: 2;
      }
      .overlay.bottom .overlay-triangle div {
        top: 7px;
        left: 5px;
      }
      
      .title {
        position: relative;
      }
      .title .name {
        white-space: nowrap;
        color: #1A1AA6;
        font-weight: bold;
        overflow: hidden;
        margin-right: 100px;
        padding: 5px 0;
        text-overflow: ellipsis;
      }
      .title .name .tag {
        color: #881280;
      }
      .title .position {
        padding: 5px 0;
        color: silver;
        width: 100px;
        text-align: right;
        position: absolute;
        top: 0;
        right: 0;
      }
      
      .controller {
        border-top: 1px solid rgba(0,0,0,0.1);
        padding: 5px 0;
      }
      .controller .intro {
        font-weight: 100;
        color: #595959;
        padding: 10px 0; 
      }
      .controller .option {
        padding: 10px 0;
        border-top: 1px solid rgba(0,0,0,0.1);
        position: relative;
        line-height: 20px;
      }
      .controller .option label {
        font-weight: bold;
      }
      .controller .option .symbol {
        width: 20px;
        height: 20px;
        position: relative;
        display: inline-block;
        vertical-align: middle;
      }
      .controller .option .symbol:before {
        content: "";
        position: absolute;
        left: 4px;
        top: 6px;
        width: 12px;
        height: 4px;
      }
      .controller .option .symbol.plus:before {
        background: #1CA600;
      }
      .controller .option .symbol.plus:after {
        content: "";
        position: absolute;
        top: 2px;
        left: 8px;
        width: 4px;
        height: 12px;
        background: #1CA600;
      }
      .controller .option .symbol.minus:before {
        background: #E20000;
      }
      .controller .option.must-include {
        color: #1CA600;
      }
      .controller .option.must-exclude {
        color: #E20000;
      }
      
      .toggle-component {
        background: #EFEFEF;
        width: 90px;
        height: 20px;
        border: 1px solid #B3B3B3;
        border-radius: 25px;
        float: right;
        position: relative;
        color: silver;
        text-shadow: 1px 1px white;
        cursor: default;
      }
      .toggle-component .label {
        width: 40px;
        display: inline-block;
        text-align: center;
        z-index: 2;
        position: relative;
      }
      .toggle-component .toggle {
        width: 45px;
        background: white;
        border: 1px solid #8E8E8E;
        position: absolute;
        top: -1px;
        height: 20px;
        z-index: 1;
        border-radius: 20px;
        box-shadow: 1px 1px 1px rgb(0 0 0 / 10%);
      }
      .toggle-component.on .label.on {
        color: black;
      }
      .toggle-component.off .label.off {
        color: black;
      }
      .toggle-component.on .toggle {
        right: -1px;
      }
      .toggle-component.off .toggle {
        left: -1px;
      }
    `;
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));

    this.shadowRoot.appendChild(style);
  }

  private connectedCallback() {
    if (this.hasStartedInitialization) return;
    this.hasStartedInitialization = true;
    this.initialize();
  }
}

// HELPERS /////////////////////////////////////////////////////////////////////////////////////////

function openSelectorGeneratorPanel() {
  const message: IMessageObject = {
    destLocation: MessageLocation.DevtoolsPrivate,
    origLocation: MessageLocation.ContentScript,
    responseCode: ResponseCode.N,
    payload: {
      event: MessageEventType.OpenSelectorGeneratorPanel,
    }
  }
  const packedMessage = packMessage(message);
  window[___sendToCore](packedMessage);
}
