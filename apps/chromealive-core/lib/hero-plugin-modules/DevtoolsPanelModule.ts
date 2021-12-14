import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import BridgeToDevtoolsPrivate from '../bridges/BridgeToDevtoolsPrivate';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import TabGroupModule from './TabGroupModule';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';

export default class DevtoolsPanelModule {
  public static bySessionId = new Map<string, DevtoolsPanelModule>();
  private bridgeToDevtoolsPrivate: BridgeToDevtoolsPrivate;

  constructor(
    bridgeToDevtoolsPrivate: BridgeToDevtoolsPrivate,
    readonly tabGroupModule: TabGroupModule,
  ) {
    this.bridgeToDevtoolsPrivate = bridgeToDevtoolsPrivate;
  }

  public onNewPuppetContext(context: IPuppetContext, session: ISessionSummary): void {
    DevtoolsPanelModule.bySessionId.set(session.id, this);
  }

  public close(session: ISessionSummary): void {
    DevtoolsPanelModule.bySessionId.delete(session.id);
  }

  public async closeDevtoolsPanelForPage(page: IPuppetPage): Promise<void> {
    let tabId = this.tabGroupModule.identityByPageId.get(page.id)?.tabId;
    try {
      if (!tabId) {
        const identity = await this.tabGroupModule.waitOn(
          'tab-identified',
          event => event.puppetPageId === page.id,
          5e3,
        );
        tabId = identity.tabId;
      }
      if (!tabId) throw new Error('TabId not found for page -> ' + page.id);
      return await this.bridgeToDevtoolsPrivate.closePanel(tabId);
    } catch (error) {
      if (error instanceof CanceledPromiseError) return;
      throw error;
    }
  }
}
