import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import BridgeToDevtoolsPrivate from '../bridges/BridgeToDevtoolsPrivate';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import TabGroupModule from './TabGroupModule';

export default class DevtoolsPanelModule {
  public static bySessionId = new Map<string, DevtoolsPanelModule>();
  private bridgeToDevtoolsPrivate: BridgeToDevtoolsPrivate;

  constructor(
    bridgeToDevtoolsPrivate: BridgeToDevtoolsPrivate,
    readonly identityByPageId: TabGroupModule['identityByPageId'],
  ) {
    this.bridgeToDevtoolsPrivate = bridgeToDevtoolsPrivate;
  }

  public onNewPuppetPage(page: IPuppetPage, session: ISessionSummary): Promise<any> {
    const sessionId = session.id;
    DevtoolsPanelModule.bySessionId.set(sessionId, this);

    page.browserContext.once('close', () => DevtoolsPanelModule.bySessionId.delete(sessionId));

    return Promise.resolve();
  }

  public closeDevtoolsPanelForPage(page: IPuppetPage) {
    const tabId = this.identityByPageId.get(page.id)?.tabId;
    if (!tabId) throw new Error('TabId not found for page -> ' + page.id);
    return this.bridgeToDevtoolsPrivate.closePanel(tabId);
  }
}
