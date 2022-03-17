import BridgeToExtension from '../bridges/BridgeToExtension';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import FocusedWindowModule from './FocusedWindowModule';
import highlightConfig from './highlightConfig';

export default class ElementsModule {
  public static bySessionId = new Map<string, ElementsModule>();

  private bridgeToExtension: BridgeToExtension;
  private sessionId: string;

  constructor(bridgeToExtension: BridgeToExtension) {
    this.bridgeToExtension = bridgeToExtension;
  }

  public onNewPuppetContext(_context: IPuppetContext, sessionSummary: ISessionSummary): void {
    this.sessionId = sessionSummary.id;
    ElementsModule.bySessionId.set(this.sessionId, this);
  }

  public async onNewPuppetPage(
    puppetPage: IPuppetPage,
    sessionSummary: ISessionSummary,
  ): Promise<any> {
    if (!this.sessionId) {
      this.sessionId ??= sessionSummary.id;
    }
    await puppetPage.devtoolsSession.send('DOM.enable');
    await puppetPage.devtoolsSession.send('Overlay.enable');
  }

  public async highlightNode(backendNodeId: number): Promise<void> {
    await FocusedWindowModule.activePuppetPage?.devtoolsSession.send('Overlay.highlightNode', {
      highlightConfig,
      backendNodeId,
    });
  }

  public async hideHighlight(): Promise<void> {
    await FocusedWindowModule.activePuppetPage?.devtoolsSession.send('Overlay.hideHighlight');
  }

  public async generateQuerySelector(_backendNodeId: number): Promise<void> {
    //
  }
}
