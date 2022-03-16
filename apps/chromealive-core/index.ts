import * as Fs from 'fs';
import HeroCore, { GlobalPool as HeroGlobalPool, Session as HeroSession } from '@ulixee/hero-core';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import Log from '@ulixee/commons/lib/Logger';
import { ChildProcess } from 'child_process';
import launchChromeAlive from '@ulixee/apps-chromealive/index';
import type Puppet from '@ulixee/hero-puppet';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import HeroCorePlugin, { extensionPath } from './lib/HeroCorePlugin';
import SessionObserver from './lib/SessionObserver';
import ConnectionToClient from './lib/ConnectionToClient';
import FocusedWindowModule from './lib/hero-plugin-modules/FocusedWindowModule';
import AliveBarPositioner from './lib/AliveBarPositioner';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import IDataboxCollectedAssetEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxCollectedAssetEvent';
import { URL } from 'url';

const { log } = Log(module);

export default class ChromeAliveCore {
  public static sessionObserversById = new Map<string, SessionObserver>();
  public static vueServer: string;
  public static get activeSessionObserver(): SessionObserver {
    return this.sessionObserversById.get(this.activeHeroSessionId);
  }

  public static restartingHeroSessionId: string;
  public static activeHeroSessionId: string;
  public static coreServerAddress?: Promise<string>;
  private static connections: ConnectionToClient[] = [];
  private static shouldAutoShowBrowser = false;
  private static app: ChildProcess;
  private static events = new EventSubscriber();

  public static setCoreServerAddress(address: Promise<string>) {
    this.coreServerAddress = address;
    this.launchApp(true).catch(err => {
      console.error('Cannot launch ChromeAlive app', err);
    });
  }

  public static addConnection(): ConnectionToClient {
    const connection = new ConnectionToClient();
    this.connections.push(connection);
    this.onWsConnected();
    this.events.once(connection, 'close', () => {
      const idx = this.connections.indexOf(connection);
      if (idx >= 0) this.connections.splice(idx, 1);
    });
    return connection;
  }

  public static register(isNodeRegisteredModule = false) {
    log.info('Registering ChromeAlive!');
    if (isNodeRegisteredModule === true) {
      this.shouldAutoShowBrowser = true;
    }

    bindFunctions(this);

    this.events.on(HeroGlobalPool.events, 'browser-launched', this.onNewBrowser);
    this.events.on(HeroGlobalPool.events, 'all-browsers-closed', this.hideApp);
    this.events.on(HeroGlobalPool.events, 'session-created', this.onHeroSessionCreated);
    this.events.on(
      HeroGlobalPool.events,
      'browser-has-no-open-windows',
      this.onBrowserHasNoWindows,
    );

    FocusedWindowModule.onVisibilityChange = this.changeActiveSessions;

    HeroCore.use(HeroCorePlugin);
  }

  public static shutdown() {
    log.info('Shutting down ChromeAlive!');
    this.closeApp();
    this.events.close();
    while (this.connections.length) {
      const next = this.connections.shift();
      next.close();
    }
    for (const observer of this.sessionObserversById.values()) {
      observer.close();
    }
    this.sessionObserversById.clear();
  }

  public static getActivePuppetPage(): IPuppetPage {
    if (!this.activeHeroSessionId) return;
    const sessionObserver = this.sessionObserversById.get(this.activeHeroSessionId);
    if (!sessionObserver) return;

    const { heroSession } = sessionObserver;
    return [...heroSession.tabsById.values()].find(x => !x.isClosing)?.puppetPage;
  }

  public static sendAppEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T] = null,
  ) {
    for (const connection of this.connections) {
      connection.sendEvent({ eventType, data });
    }
  }

  private static async onHeroSessionCreated(event: { session: HeroSession }): Promise<any> {
    const { session: heroSession } = event;

    const script = heroSession.options.scriptInstanceMeta?.entrypoint;
    if (!script) return;

    if (
      heroSession.mode === 'timetravel' ||
      heroSession.mode === 'production' ||
      heroSession.mode === 'background'
    ) {
      return;
    }

    if (heroSession.mode === 'multiverse') {
      const observer = this.sessionObserversById.get(this.activeHeroSessionId);
      observer?.onMultiverseSession(heroSession);
      return;
    }

    if (heroSession.mode === 'development' && !('extractSessionId' in heroSession.options)) {
      heroSession.configureHeaded({ showBrowser: true });
      heroSession.options.sessionKeepAlive = true;
      heroSession.options.viewport ??= { width: 0, height: 0 };
    }
    // if not auto-registered, check if browser is showing
    if (!heroSession.options.showBrowser) return;

    const sessionId = heroSession.id;
    log.info('New Hero Session Created: %s (%s)', {
      script: script.split('/').pop(),
      sessionId,
    });
    // keep alive session
    heroSession.options.sessionKeepAlive = true;
    const sessionObserver = new SessionObserver(heroSession);
    const coreServerAddress = await this.coreServerAddress;
    heroSession.mitmRequestSession.bypassResourceRegistrationForHost = new URL(coreServerAddress);

    this.sessionObserversById.set(sessionId, sessionObserver);
    const sourceCode = sessionObserver.sourceCodeTimeline;
    const timetravel = sessionObserver.timetravelPlayer;
    const on = this.events.on.bind(this.events);
    const sessionEvents = [
      on(sessionObserver, 'hero:updated', this.sendActiveSession.bind(this, sessionId)),
      on(sessionObserver, 'app:mode', this.sendAppModeEvent.bind(this, sessionId)),
      on(sessionObserver, 'databox:output', this.sendDataboxUpdatedEvent.bind(this, sessionId)),
      on(
        sessionObserver,
        'databox:asset',
        this.sendDataboxCollectedAssetsEvent.bind(this, sessionId),
      ),
      on(sessionObserver, 'closed', this.onSessionObserverClosed.bind(this, sessionObserver)),
      on(sourceCode, 'command', this.sendAppEvent.bind(this, 'Command.updated')),
      on(sourceCode, 'source', this.sendAppEvent.bind(this, 'SourceCode.updated')),
      on(timetravel, 'new-tick-command', this.sendCommandFocusedEvent.bind(this, sessionId)),
      on(timetravel, 'new-paint-index', this.sendPaintIndexEvent.bind(this, sessionId)),
      on(timetravel, 'new-offset', this.sendTimetravelOffset.bind(this, sessionId)),
    ];
    this.events.group('session', ...sessionEvents);

    this.sendActiveSession(sessionId);

    const isRestartedSessionId =
      this.restartingHeroSessionId === heroSession.options.sessionResume?.sessionId;

    if (!this.activeHeroSessionId || isRestartedSessionId) {
      this.restartingHeroSessionId = null;
      this.sendAppEvent('Session.loading');
      AliveBarPositioner.showHeroSessionOnBounds(heroSession.id);
      this.events.once(sessionObserver, 'hero:updated', () => {
        this.sendAppEvent('Session.loaded');
        AliveBarPositioner.showApp();
      });
      this.activeHeroSessionId = heroSession.id;
    }
  }

  private static onWsConnected() {
    log.info('ChromeAlive! Ws Connected', {
      sessionId: this.activeHeroSessionId,
    });
    if (this.activeHeroSessionId) {
      this.sendActiveSession(this.activeHeroSessionId);
      this.sendDataboxUpdatedEvent(this.activeHeroSessionId);
    }
  }

  private static sendCommandFocusedEvent(
    sessionId: string,
    event: TimetravelPlayer['EventTypes']['new-tick-command'],
  ): void {
    this.sendDataboxUpdatedEvent(sessionId);
    this.sendAppEvent('Command.focused', event);
  }

  private static sendTimetravelOffset(
    sessionId: string,
    event: TimetravelPlayer['EventTypes']['new-offset'],
  ): void {
    this.sendAppEvent('Session.timetravel', event);
  }

  private static sendPaintIndexEvent(
    sessionId: string,
    event: TimetravelPlayer['EventTypes']['new-paint-index'],
  ): void {
    this.sendAppEvent('Dom.focus', {
      highlightPaintIndexRange: event.paintIndexRange,
      documentLoadPaintIndex: event.documentLoadPaintIndex,
    });
  }

  private static onSessionObserverClosed(sessionObserver: SessionObserver) {
    const heroSessionId = sessionObserver.heroSession.id;
    this.sessionObserversById.delete(heroSessionId);
    this.events.endGroup('session');
    if (this.activeHeroSessionId === heroSessionId) {
      this.activeHeroSessionId = null;
      if (this.restartingHeroSessionId === heroSessionId) {
        this.sendAppEvent('Session.active', {
          heroSessionId: null,
          timeline: { urls: [], screenshots: [], paintEvents: [], storageEvents: [] },
          run: 0,
          playbackState: 'running',
          mode: 'Live',
          worldHeroSessionIds: [],
          startTime: Date.now(),
          inputBytes: 0,
          runtimeMs: 0,
          ...sessionObserver.getScriptDetails(),
        });
      } else {
        AliveBarPositioner.hideApp();
        this.sendAppEvent('Session.active', null);
      }

      this.sendAppEvent('Databox.output', {
        changes: [],
        output: null,
        bytes: 0,
      });
    }
  }

  private static sendActiveSession(heroSessionId: string) {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;

    this.sendAppEvent('Session.active', sessionObserver.getHeroSessionEvent());
  }

  private static sendDataboxUpdatedEvent(heroSessionId: string) {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;
    this.sendAppEvent('Databox.output', sessionObserver.getDataboxEvent());
  }

  private static sendDataboxCollectedAssetsEvent(
    heroSessionId: string,
    event: IDataboxCollectedAssetEvent,
  ): void {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;
    this.sendAppEvent('Databox.collected-asset', event);
  }

  private static sendAppModeEvent(heroSessionId: string) {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;
    this.sendAppEvent('App.mode', { mode: sessionObserver.mode });
  }

  private static changeActiveSessions(
    status: { focused: boolean; active: boolean },
    heroSessionId: string,
    puppetPageId: string,
  ): void {
    const isPageVisible = status.active;
    log.info('Changing active session', { isPageVisible, sessionId: heroSessionId, pageId: puppetPageId });

    if (this.activeHeroSessionId) {
      AliveBarPositioner.showApp(status.focused);
    } else {
      AliveBarPositioner.hideApp();
    }
  }

  private static async launchApp(hideOnLaunch = false): Promise<void> {
    if (this.app && !this.app.killed) return;

    const args: string[] = hideOnLaunch ? ['--hide'] : [];
    if (this.coreServerAddress) {
      const coreServerAddress = await this.coreServerAddress;
      const filePath = `${extensionPath}/data/coreServer.json`;
      Fs.writeFileSync(filePath, JSON.stringify({ address: coreServerAddress }));
      args.push(`--coreServerAddress=${coreServerAddress}`);
    }

    this.app = launchChromeAlive(...args);
    this.events.once(this.app, 'exit', () => (this.app = null));
    this.events.once(this.app, 'close', () => (this.app = null));
    log.info('Launched Electron App', {
      file: this.app?.spawnfile,
      args: this.app?.spawnargs,
      sessionId: null,
    });
  }

  private static onBrowserHasNoWindows(event: { puppet: Puppet }) {
    // only check for headed
    if (!event.puppet.browserEngine.isHeaded) return;

    const browserId = event.puppet.browserId;
    setTimeout(() => {
      const sessionsUsingEngine = HeroSession.sessionsWithBrowserId(browserId);
      const hasWindows = sessionsUsingEngine.some(x => x.tabsById.size > 0);
      if (!hasWindows) {
        return event.puppet.close();
      }
    }, 2e3).unref();
  }

  private static async onNewBrowser(): Promise<void> {
    await this.launchApp();
  }

  private static hideApp(): void {
    AliveBarPositioner.hideApp();
  }

  private static closeApp(): void {
    log.stats('Closing Electron App');
    this.sendAppEvent('App.quit');
    this.app = null;
  }
}
