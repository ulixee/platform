import * as fs from 'fs';
import { IPage } from '@ulixee/unblocked-specification/agent/browser/IPage';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import IDevtoolsSession, {
  Protocol,
} from '@ulixee/unblocked-specification/agent/browser/IDevtoolsSession';
import IElementSummary from '@ulixee/apps-chromealive-interfaces/IElementSummary';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import {
  ___emitFromDevtoolsToCore,
  EventType,
} from '../../injected-scripts/DevtoolsBackdoorConfig';
import AppReplayWindowController from '../AppReplayWindowController';

export default class DevtoolsBackdoorModule {
  private events = new EventSubscriber();

  private devtoolsSessionToTabId = new Map<IDevtoolsSession, number>();
  private devtoolsSessionByTabId = new Map<number, IDevtoolsSession>();

  constructor(readonly replayWindow: AppReplayWindowController) {
    bindFunctions(this);
  }

  public async onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession): Promise<void> {
    let response: Protocol.Runtime.EvaluateResponse;
    try {
      response = await devtoolsSession.send('Runtime.evaluate', {
        expression: `(function devtoolsBackdoorInjectedScripts() {
          ${injectedScript};
          return DevtoolsBackdoor.getInspectedTabId(10e3);
        })();`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception.description);
      }
    } catch (error) {
      if (error.message.includes('Cannot find context with specified id')) return;
      throw error;
    }
    const tabId = response.result.value;

    this.devtoolsSessionToTabId.set(devtoolsSession, tabId);
    this.devtoolsSessionByTabId.set(tabId, devtoolsSession);

    this.events.on(
      devtoolsSession,
      'Runtime.bindingCalled',
      this.handleIncomingMessageFromBrowser.bind(this, tabId),
    );

    await devtoolsSession.send('Runtime.addBinding', { name: ___emitFromDevtoolsToCore });
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession): void {
    const tabId = this.devtoolsSessionToTabId.get(devtoolsSession);
    this.devtoolsSessionToTabId.delete(devtoolsSession);
    this.devtoolsSessionByTabId.delete(tabId);
  }

  public close(): void {
    this.devtoolsSessionToTabId.clear();
    this.devtoolsSessionByTabId.clear();
    this.events.close();
  }

  public async showElementsPanel(page: IPage): Promise<void> {
    const tabId = this.replayWindow.getChromeTabIdByPageId(page.id);
    await this.send(tabId, 'DevtoolsBackdoor.showElementsPanel');
  }

  // COMMANDS

  public async toggleInspectElementMode(): Promise<boolean> {
    const page = this.replayWindow.activePage;
    if (!page) return;

    const tabId = this.replayWindow.getChromeTabIdByPageId(page.id);
    return await this.send(tabId, 'DevtoolsBackdoor.toggleInspectElementMode');
  }

  public async closeDevtoolsPanelForPage(page: IPage): Promise<void> {
    const tabId = this.replayWindow.getChromeTabIdByPageId(page.id);
    await this.send(tabId, 'DevtoolsBackdoor.closeDevtools');
  }

  public async searchDom(query: string): Promise<IElementSummary[]> {
    const page = this.replayWindow.activePage;
    if (!page) return [];

    const tabId = this.replayWindow.getChromeTabIdByPageId(page.id);
    await this.send(tabId, 'DevtoolsBackdoor.showElementsPanel');
    return await this.send(tabId, 'DevtoolsBackdoor.searchDom', [query]);
  }

  // END OF COMMANDS

  private handleIncomingMessageFromBrowser(tabId: number, message: any): void {
    if (message.name !== ___emitFromDevtoolsToCore) return;
    const payload = JSON.parse(message.payload);
    const event = payload.event;
    if (event === EventType.ElementWasSelected) {
      this.emitElementWasSelected(tabId, payload.backendNodeId).catch(console.error);
    } else if (event === EventType.ToggleInspectElementMode) {
      this.emitToggleInspectElementMode(payload.isActive);
    }
  }

  private async emitElementWasSelected(tabId: number, backendNodeId: number): Promise<void> {
    const page = await this.replayWindow.getPageByChromeTabId(tabId);
    if (!page) {
      console.warn('Element emitted for non-ChromeAlive tab', { tabId, backendNodeId });
      return;
    }

    const result = await page.devtoolsSession.send('DOM.describeNode', {
      backendNodeId,
    });

    const nodeOverview = result.node;
    const element = this.toElementSummary(nodeOverview, { backendNodeId });

    this.replayWindow.sendApiEvent('DevtoolsBackdoor.elementWasSelected', {
      element,
    });
  }

  private emitToggleInspectElementMode(isActive: boolean): void {
    this.replayWindow.sendApiEvent('DevtoolsBackdoor.toggleInspectElementMode', { isActive });
  }

  private toElementSummary(
    nodeOverview: Protocol.DOM.Node,
    id: { backendNodeId?: number; objectId?: string },
  ): IElementSummary {
    const attributes: IElementSummary['attributes'] = [];
    if (nodeOverview.attributes) {
      for (let i = 0; i < nodeOverview.attributes.length; i += 2) {
        const name = nodeOverview.attributes[i];
        const value = nodeOverview.attributes[i + 1];
        attributes.push({ name, value });
      }
    }
    return {
      ...id,
      localName: nodeOverview.localName,
      nodeName: nodeOverview.nodeName,
      nodeType: nodeOverview.nodeType,
      attributes,
      hasChildren: nodeOverview.childNodeCount > 0,
      nodeValueInternal: nodeOverview.nodeValue,
    };
  }

  private async send(tabId: number, command: string, args: any[] = []): Promise<any> {
    const devtoolsSession = this.devtoolsSessionByTabId.get(tabId);
    const response = await devtoolsSession.send('Runtime.evaluate', {
      expression: `(function devtoolsBackdoorCommand() {
        return ${command}(...${JSON.stringify(args)});
      })();`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception.description);
    }

    return response.result.value;
  }
}

const pageScripts = {
  DevtoolsBackdoorConfig: fs.readFileSync(
    `${__dirname}/../../injected-scripts/DevtoolsBackdoorConfig.js`,
    'utf8',
  ),
  DevtoolsBackdoor: fs.readFileSync(
    `${__dirname}/../../injected-scripts/DevtoolsBackdoor.js`,
    'utf8',
  ),
};

const injectedScript = `(function devtoolsBackdoor() {
  if (window.__backdoorInstalled) return;
  window.__backdoorInstalled = true;
  
  const exports = {}; // workaround for ts adding an exports variable
  
  ${pageScripts.DevtoolsBackdoorConfig};
  ${pageScripts.DevtoolsBackdoor};
})();`;
