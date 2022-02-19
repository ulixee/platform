import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import { EventEmitter } from 'events';
import BridgeToExtension from '../bridges/BridgeToExtension';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';

export default class FocusedWindowModule {
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
    page: IPuppetPage,
    sessionSummary: ISessionSummary,
    events: EventSubscriber,
  ): Promise<any> {
    if (!this.sessionId) {
      this.sessionId ??= sessionSummary.id;
      if (process.env.HERO_DEBUG_CHROMEALIVE) this.debugServiceWorker(page.devtoolsSession, events);
    }
    const pageId = page.id;
    events.once(page, 'close', this.handlePageIsClosed.bind(this, pageId));

    return Promise.resolve();
  }

  private handlePageIsVisible(payload: any, puppetPageId: string) {
    FocusedWindowModule.onVisibilityChange(
      { active: true, focused: payload.focused },
      this.sessionId,
      puppetPageId,
    );
  }

  private handlePageIsClosed(puppetPageId: string): void {
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
