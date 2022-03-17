import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import { EventEmitter } from 'events';
import BridgeToExtension from '../bridges/BridgeToExtension';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';

export default class FocusedWindowModule {
  public static activePuppetPage: IPuppetPage;

  private puppetPagesById = new Map<string, IPuppetPage>();
  private sessionId: string;
  private bridgeToExtension: BridgeToExtension;

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    this.bridgeToExtension = bridgeToExtension;
    browserEmitter.on('payload', (payload, puppetPageId) => {
      if (payload.event === 'OnPageVisible') {
        this.handlePageIsVisible(payload, puppetPageId);
      }
    });
  }

  public onNewPuppetPage(
    puppetPage: IPuppetPage,
    sessionSummary: ISessionSummary,
    events: EventSubscriber,
  ): Promise<any> {
    if (!this.sessionId) {
      this.sessionId ??= sessionSummary.id;
      if (process.env.HERO_DEBUG_CHROMEALIVE)
        this.debugServiceWorker(puppetPage.devtoolsSession, events);
    }
    this.puppetPagesById.set(puppetPage.id, puppetPage);
    events.once(puppetPage, 'close', this.handlePuppetPageIsClosed.bind(this, puppetPage.id));

    return Promise.resolve();
  }

  private handlePageIsVisible(payload: any, puppetPageId: string): void {
    FocusedWindowModule.activePuppetPage = this.puppetPagesById.get(puppetPageId);
    FocusedWindowModule.onVisibilityChange(
      { active: true, focused: payload.focused },
      this.sessionId,
      puppetPageId,
    );
  }

  private handlePuppetPageIsClosed(puppetPageId: string): void {
    this.puppetPagesById.delete(puppetPageId);
    if (FocusedWindowModule.activePuppetPage?.id === puppetPageId) {
      FocusedWindowModule.activePuppetPage = undefined;
    }
    FocusedWindowModule.onVisibilityChange(
      { active: false, focused: false },
      this.sessionId,
      puppetPageId,
    );
  }

  private debugServiceWorker(devtoolsSession: IDevtoolsSession, events: EventSubscriber): void {
    devtoolsSession.send('ServiceWorker.enable').catch(console.error);
    events.on(devtoolsSession, 'ServiceWorker.workerErrorReported', ev =>
      // eslint-disable-next-line no-console
      console.debug('ServiceWorker.workerErrorReported', ev.errorMessage),
    );
    events.on(devtoolsSession, 'ServiceWorker.workerRegistrationUpdated', ev =>
      // eslint-disable-next-line no-console
      console.debug('ServiceWorker.workerRegistrationUpdated', ...ev.registrations),
    );
    events.on(devtoolsSession, 'ServiceWorker.workerVersionUpdated', ev =>
      // eslint-disable-next-line no-console
      console.debug('ServiceWorker.workerVersionUpdated', ...ev.versions),
    );
  }

  public static onVisibilityChange: (
    status: { focused: boolean; active: boolean },
    sessionId: string,
    puppetPageId: string,
  ) => any = () => null;
}
