import CorePlugin from '@ulixee/hero-plugin-utils/lib/CorePlugin';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import ConsoleMessage from '@ulixee/hero-puppet-chrome/lib/ConsoleMessage';
import { extensionId } from '../index';

export default class TabGroupCorePlugin extends CorePlugin {
  public static id = '@ulixee/tabgroup-core-plugin';

  private puppetPagesById = new Map<string, IPuppetPage>();

  private identityByPageId = new Map<string, { tabId: number; windowId: number }>();
  private extensionContextIdByPageId = new Map<string, number>();

  onNewPuppetPage(page: IPuppetPage, sessionSummary: ISessionSummary): Promise<any> {
    if (!sessionSummary.options.showBrowser) return;

    this.puppetPagesById.set(page.id, page);

    const pageId = page.id;
    page.on('close', () => this.puppetPagesById.delete(pageId));

    page.devtoolsSession.on(
      'Runtime.executionContextCreated',
      this.onContextCreated.bind(this, page.id),
    );
    page.devtoolsSession.on(
      'Runtime.executionContextDestroyed',
      this.onContextDestroyed.bind(this, page.id),
    );
    page.devtoolsSession.on(
      'Runtime.executionContextsCleared',
      this.onContextCleared.bind(this, page.id),
    );

    return Promise.all([
      page.addPageCallback(
        '___onTabIdentify',
        this.onTabIdentified.bind(this, sessionSummary.id, page.id),
      ),
    ]);
  }

  onTabIdentified(sessionId: string, puppetPageId: string, payload: string): void {
    const { windowId, tabId } = JSON.parse(payload);
    this.identityByPageId.set(puppetPageId, { windowId, tabId });
  }

  async groupAllPages(): Promise<void> {
    const firstPage = [...this.puppetPagesById.values()][0];
    const tabIds: number[] = [];
    let windowId: number;
    for (const id of this.identityByPageId.values()) {
      windowId = id.windowId;
      tabIds.push(id.tabId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const groupId = await this.callExtensionAction(firstPage.id, 'groupTabs', {
      tabIds,
      windowId,
      title: 'All Tabs',
      color: 'blue',
    });
  }

  private async identifyTab(puppetPageId: string): Promise<void> {
    const { tabId, windowId } = await this.callExtensionAction(puppetPageId, 'identify');

    this.identityByPageId.set(puppetPageId, { tabId, windowId });
  }

  private async callExtensionAction<T>(
    puppetPageId: string,
    action: string,
    args: object = {},
  ): Promise<T> {
    const page = this.puppetPagesById.get(puppetPageId);
    if (!page) throw new Error('Page not found running extension method');

    const contextId = this.extensionContextIdByPageId.get(puppetPageId);
    if (!contextId) throw new Error('Extension context not loaded for page');

    const message = { action, ...args };
    const result = await page.devtoolsSession.send('Runtime.evaluate', {
      expression: `new Promise((resolve, reject) => chrome.runtime.sendMessage(${JSON.stringify(
        message,
      )}, {}, result => {
        if (result instanceof Error) reject(result);
        else resolve(result);
      }))`,
      contextId,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw ConsoleMessage.exceptionToError(result.exceptionDetails);
    }
    const remote = result.result;
    if (remote.objectId) page.devtoolsSession.disposeRemoteObject(remote);
    return remote.value as T;
  }

  private onContextCreated(
    puppetPageId: string,
    event: Protocol.Runtime.ExecutionContextCreatedEvent,
  ): void {
    const { context } = event;
    const page = this.puppetPagesById.get(puppetPageId);
    if (!page) return;
    if (context.origin === `chrome-extension://${extensionId}`) {
      if (context.auxData?.frameId === page.mainFrame.id) {
        this.extensionContextIdByPageId.set(puppetPageId, context.id);
      }
    }
  }

  private onContextDestroyed(
    puppetPageId: string,
    event: Protocol.Runtime.ExecutionContextDestroyedEvent,
  ): void {
    const { executionContextId } = event;
    if (this.extensionContextIdByPageId.get(puppetPageId) === executionContextId) {
      this.extensionContextIdByPageId.delete(puppetPageId);
    }
  }

  private onContextCleared(puppetPageId: string): void {
    this.extensionContextIdByPageId.delete(puppetPageId);
  }
}
