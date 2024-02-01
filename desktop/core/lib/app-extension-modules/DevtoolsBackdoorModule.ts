import * as fs from 'fs';
import { IPage } from '@ulixee/unblocked-specification/agent/browser/IPage';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import IDevtoolsSession, {
  Protocol,
} from '@ulixee/unblocked-specification/agent/browser/IDevtoolsSession';
import IElementSummary from '@ulixee/desktop-interfaces/IElementSummary';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Log from '@ulixee/commons/lib/Logger';
import {
  ___emitFromDevtoolsToCore,
  EventType,
} from '../../injected-scripts/DevtoolsBackdoorConfig';
import ChromeAliveWindowController from '../ChromeAliveWindowController';
import TargetInfo = Protocol.Target.TargetInfo;

const { log } = Log(module);

export default class DevtoolsBackdoorModule {
  private events = new EventSubscriber();

  private devtoolsDetachedSessionIds = new Set<string>();
  private devtoolsSessionByTargetId = new Map<string, IDevtoolsSession>();
  private devtoolsSessionToIds = new Map<IDevtoolsSession, { tabId: number; targetId: string }>();
  private devtoolsSessionByTabId = new Map<number, Set<IDevtoolsSession>>();
  private logger: IBoundLog;

  constructor(readonly chromeAliveWindowController: ChromeAliveWindowController) {
    bindFunctions(this);
    this.logger = log.createChild(module, { sessionId: chromeAliveWindowController.sessionId });
  }

  public async onDevtoolsPanelAttached(
    devtoolsSession: IDevtoolsSession,
    targetInfo: TargetInfo,
  ): Promise<void> {
    if (this.devtoolsDetachedSessionIds.has(devtoolsSession.id)) return;
    if (this.devtoolsSessionByTargetId.has(targetInfo.targetId)) {
      await devtoolsSession.send('Target.detachFromTarget');
      return;
    }

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
    if (this.devtoolsSessionToIds.has(devtoolsSession)) return;

    this.devtoolsSessionToIds.set(devtoolsSession, { tabId, targetId: targetInfo.targetId });
    const byTabId = this.devtoolsSessionByTabId.get(tabId) ?? new Set<IDevtoolsSession>();
    byTabId.add(devtoolsSession);
    this.devtoolsSessionByTabId.set(tabId, byTabId);

    this.events.on(
      devtoolsSession,
      'Runtime.bindingCalled',
      this.handleIncomingMessageFromBrowser.bind(this, tabId),
    );

    await devtoolsSession.send('Runtime.addBinding', { name: ___emitFromDevtoolsToCore });
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession): void {
    this.devtoolsDetachedSessionIds.add(devtoolsSession.id);
    const ids = this.devtoolsSessionToIds.get(devtoolsSession);
    this.devtoolsSessionToIds.delete(devtoolsSession);

    if (ids) {
      const { tabId, targetId } = ids;
      this.devtoolsSessionByTargetId.delete(targetId);
      const byTabId = this.devtoolsSessionByTabId.get(tabId);
      byTabId?.delete(devtoolsSession);
      if (byTabId?.size === 0) this.devtoolsSessionByTabId.delete(tabId);
    }
  }

  public close(): void {
    this.devtoolsSessionToIds.clear();
    this.devtoolsSessionByTargetId.clear();
    this.devtoolsSessionByTabId.clear();
    this.events.close();
  }

  public async showElementsPanel(page: IPage): Promise<void> {
    const tabId = this.chromeAliveWindowController.getChromeTabIdByPageId(page.id);
    await this.send(tabId, 'DevtoolsBackdoor.showElementsPanel');
  }

  // COMMANDS

  public async toggleInspectElementMode(): Promise<boolean> {
    const page = this.chromeAliveWindowController.activePage;
    if (!page) return;

    const tabId = this.chromeAliveWindowController.getChromeTabIdByPageId(page.id);
    return await this.send(tabId, 'DevtoolsBackdoor.toggleInspectElementMode');
  }

  public async closeDevtoolsPanelForPage(page: IPage): Promise<void> {
    const tabId = this.chromeAliveWindowController.getChromeTabIdByPageId(page.id);
    await this.send(tabId, 'DevtoolsBackdoor.closeDevtools');
  }

  public async searchDom(query: string): Promise<IElementSummary[]> {
    const page = this.chromeAliveWindowController.activePage;
    if (!page) return [];

    const tabId = this.chromeAliveWindowController.getChromeTabIdByPageId(page.id);
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
    const page = await this.chromeAliveWindowController.getPageByChromeTabId(tabId);
    if (!page) {
      this.logger.warn('Element emitted for non-ChromeAlive tab', { tabId, backendNodeId });
      return;
    }

    const result = await page.devtoolsSession.send('DOM.describeNode', {
      backendNodeId,
    });

    const nodeOverview = result.node;
    const element = this.toElementSummary(nodeOverview, { backendNodeId });

    this.chromeAliveWindowController.sendApiEvent('DevtoolsBackdoor.elementWasSelected', {
      element,
    });
  }

  private emitToggleInspectElementMode(isActive: boolean): void {
    this.chromeAliveWindowController.sendApiEvent('DevtoolsBackdoor.toggleInspectElementMode', {
      isActive,
    });
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
    for (const devtoolsSession of this.devtoolsSessionByTabId.get(tabId) ?? []) {
      try {
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
      } catch (error) {
        this.logger.warn('ERROR sending to DevtoolsBackdoor', error);
      }
    }
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
