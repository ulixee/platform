import * as fs from 'fs';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import IDevtoolsSession, { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import TabGroupModule from './TabGroupModule';
import { EventType, ___emitFromDevtoolsToCore } from '../../injected-scripts/DevtoolsBackdoorConfig';
import FocusedWindowModule from './FocusedWindowModule';
import ChromeAliveCore from '../../index';

export default class DevtoolsBackdoorModule {
  public static bySessionId = new Map<string, DevtoolsBackdoorModule>();
  private events = new EventSubscriber();
  
  private devtoolsSessionMap = new Map<
    IDevtoolsSession,
    { executionContextId: number; tabId?: number }
  >();

  private tabMap = new Map<
    number,
    { executionContextId: number; devtoolsSession: IDevtoolsSession }
  >();

  constructor(readonly tabGroupModule: TabGroupModule) {}

  public onNewPuppetContext(context: IPuppetContext, session: ISessionSummary): void {
    DevtoolsBackdoorModule.bySessionId.set(session.id, this);
  }

  public async onDevtoolsPanelAttached(devtoolsSession: IDevtoolsSession) {
    this.events.on(devtoolsSession, 'Runtime.executionContextCreated', event =>
      this.onExecutionContextCreated(devtoolsSession, event),
    );

    this.events.on(devtoolsSession, 'Runtime.bindingCalled', event =>
      this.handleIncomingMessageFromBrowser(devtoolsSession, event),
    );

    await Promise.all([
      devtoolsSession.send('Runtime.addBinding', { name: ___emitFromDevtoolsToCore }),
      devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
    ]).catch(() => null);
  }

  public onDevtoolsPanelDetached(devtoolsSession: IDevtoolsSession) {
    const tabId = this.devtoolsSessionMap.get(devtoolsSession)?.tabId;
    this.devtoolsSessionMap.delete(devtoolsSession);
    this.tabMap.delete(tabId);
  }

  public close(session: ISessionSummary): void {
    this.devtoolsSessionMap.clear();
    this.tabMap.clear();
    this.events.close();
    DevtoolsBackdoorModule.bySessionId.delete(session.id);
  }

  // COMMANDS

  public async toggleInspectElementMode(): Promise<boolean> {
    const puppetPage = FocusedWindowModule.activePuppetPage;
    if (!puppetPage) return;

    const tabId = await this.tabGroupModule.getTabIdByPuppetPageId(puppetPage.id);
    return await this.send(tabId, 'DevtoolsBackdoor.toggleInspectElementMode');
  }

  public async closeDevtoolsPanelForPage(puppetPage: IPuppetPage): Promise<void> {
    const tabId = await this.tabGroupModule.getTabIdByPuppetPageId(puppetPage.id); 
    await this.send(tabId, 'DevtoolsBackdoor.closeDevtools');
  }

  public async searchDom(query: string): Promise<any[]> {
    const puppetPage = FocusedWindowModule.activePuppetPage;
    if (!puppetPage) return;

    const tabId = await this.tabGroupModule.getTabIdByPuppetPageId(puppetPage.id); 
    await this.send(tabId, 'DevtoolsBackdoor.showElementsPanel');
    const elementSummaries = await this.send(tabId, 'DevtoolsBackdoor.searchDom', [query]);

    return elementSummaries;
  }

  // END OF COMMANDS

  private handleIncomingMessageFromBrowser(devtoolsSession: IDevtoolsSession, message: any) {
    if (message.name !== ___emitFromDevtoolsToCore) return;
    const payload = JSON.parse(message.payload);
    const event = payload.event;
    if (event === EventType.ElementWasSelected) {
      this.emitElementWasSelected(devtoolsSession, payload.backendNodeId).catch(console.error);
    } else if (event === EventType.ToggleInspectElementMode) {
      this.emitToggleInspectElementMode(payload.isActive);  
    }
  }

  private async emitElementWasSelected(devtoolsSession: IDevtoolsSession, backendNodeId: number) {
    const { tabId } = this.devtoolsSessionMap.get(devtoolsSession);
    const puppetPage = await this.tabGroupModule.getPuppetPageByTabId(tabId);
    if (!puppetPage) {
      // TODO: This should not be thrown. Find out why.
      console.error('MISSING puppetPage: ', tabId, puppetPage);
    }
    const result = await puppetPage.devtoolsSession.send('DOM.describeNode', {
      backendNodeId,
    });
    const nodeOverview = result.node;
    ChromeAliveCore.sendAppEvent('DevtoolsBackdoor.elementWasSelected', { backendNodeId, nodeOverview });
  }

  private emitToggleInspectElementMode(isActive: boolean) {
    ChromeAliveCore.sendAppEvent('DevtoolsBackdoor.toggleInspectElementMode', { isActive });
  }

  private async onExecutionContextCreated(
    devtoolsSession: IDevtoolsSession,
    event: Protocol.Runtime.ExecutionContextCreatedEvent,
  ): Promise<void> {
    if (this.devtoolsSessionMap.has(devtoolsSession)) return;
    
    let response: Protocol.Runtime.EvaluateResponse;
    try {
      response = await devtoolsSession.send('Runtime.evaluate', {
        expression: `(function devtoolsBackdoorInjectedScripts() {
          ${injectedScript};
          return DevtoolsBackdoor.getInspectedTabId();
        })();`,
        awaitPromise: true,
        returnByValue: true,
        contextId: event.context.id,
      });
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception.description);
      }
    } catch(error) {
      if (error.message.includes('Cannot find context with specified id')) return;
      throw error;
    }
    const executionContextId = event.context.id;
    const tabId = response.result.value;

    this.devtoolsSessionMap.set(devtoolsSession, { executionContextId, tabId });
    this.tabMap.set(tabId, { executionContextId, devtoolsSession });
  }

  private async send(tabId: number, command: string, args: any[] = []): Promise<any> {
    const { devtoolsSession, executionContextId } = this.tabMap.get(tabId);
    const response = await devtoolsSession.send('Runtime.evaluate', {
      expression: `(function devtoolsBackdoorCommand() {
        return ${command}(...${JSON.stringify(args)});
      })();`,
      awaitPromise: true,
      returnByValue: true,
      contextId: executionContextId,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception.description);
    }

    return response.result.value;
  }
}

const pageScripts = {
  DevtoolsBackdoorConfig: fs.readFileSync(`${__dirname}/../../injected-scripts/DevtoolsBackdoorConfig.js`, 'utf8'),
  DevtoolsBackdoor: fs.readFileSync(`${__dirname}/../../injected-scripts/DevtoolsBackdoor.js`, 'utf8'),
};

const injectedScript = `(function devtoolsBackdoor() {
  const exports = {}; // workaround for ts adding an exports variable

  ${pageScripts.DevtoolsBackdoorConfig};
  ${pageScripts.DevtoolsBackdoor};
})();`;
