import * as Fs from 'fs';
import HeroCore, { Session as HeroSession } from '@ulixee/hero-core';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import Log from '@ulixee/commons/lib/Logger';
import { ChildProcess } from 'child_process';
import launchChromeAlive from '@ulixee/apps-chromealive/index';
import { Browser } from '@unblocked-web/agent';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { IPage } from '@unblocked-web/specifications/agent/browser/IPage';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import TimetravelPlayer from '@ulixee/hero-timetravel/player/TimetravelPlayer';
import IDataboxCollectedAssetEvent from '@ulixee/apps-chromealive-interfaces/events/IDataboxCollectedAssetEvent';
import { URL } from 'url';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ChromeAliveCoreApis from './apis';
import AliveBarPositioner from './lib/AliveBarPositioner';
import SessionObserver from './lib/SessionObserver';
import HeroCorePlugin, { extensionPath } from './lib/HeroCorePlugin';

const { log } = Log(module);

type IConnectionToChromeAliveClient = IConnectionToClient<
  typeof ChromeAliveCoreApis,
  IChromeAliveEvents
>;

export default class ChromeAliveCore {
  public static sessionObserversById = new Map<string, SessionObserver>();
  public static vueServer: string;
  public static get activeSessionObserver(): SessionObserver {
    return this.sessionObserversById.get(this.activeHeroSessionId);
  }

  public static restartingHeroSessionId: string;
  public static activeHeroSessionId: string;
  public static coreServerAddress?: Promise<string>;
  private static connections: IConnectionToChromeAliveClient[] = [];
  private static app: ChildProcess;
  private static events = new EventSubscriber();

  public static setCoreServerAddress(address: Promise<string>): void {
    this.coreServerAddress = address;
    this.launchApp(true).catch(err => {
      console.error('Cannot launch ChromeAlive app', err);
    });
  }

  public static addConnection(
    transport: ITransportToClient<typeof ChromeAliveCoreApis>,
  ): IConnectionToChromeAliveClient {
    const connection: IConnectionToChromeAliveClient = new ConnectionToClient(
      transport,
      ChromeAliveCoreApis,
    );
    this.connections.push(connection);
    this.onWsConnected();
    this.events.once(connection, 'disconnect', () => {
      const idx = this.connections.indexOf(connection);
      if (idx >= 0) this.connections.splice(idx, 1);
    });
    return connection;
  }

  public static register(): void {
    log.info('Registering ChromeAlive!');

    bindFunctions(this);

    this.events.on(HeroCore.events, 'browser-launched', this.onNewBrowser);
    this.events.on(HeroCore.events, 'all-browsers-closed', () => AliveBarPositioner.resetSession());
    this.events.on(HeroCore.events, 'browser-has-no-open-windows', this.onBrowserHasNoWindows);
    this.events.on(HeroSession.events, 'new', this.onHeroSessionCreated);

    HeroCore.use(HeroCorePlugin);
  }

  public static shutdown(): void {
    log.info('Shutting down ChromeAlive!');
    this.closeApp();
    this.events.close();
    while (this.connections.length) {
      const next = this.connections.shift();
      void next.disconnect();
    }
    for (const observer of this.sessionObserversById.values()) {
      observer.close();
    }
    this.sessionObserversById.clear();
  }

  public static getActivePage(): IPage {
    if (!this.activeHeroSessionId) return;
    const sessionObserver = this.sessionObserversById.get(this.activeHeroSessionId);
    if (!sessionObserver) return;

    const { heroSession } = sessionObserver;
    return [...heroSession.tabsById.values()].find(x => !x.isClosing)?.page;
  }

  public static sendAppEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T] = null,
  ): void {
    for (const connection of this.connections) {
      connection.sendEvent({ eventType, data });
    }
  }

  public static changeActiveSessions(
    status: { focused: boolean; active: boolean },
    heroSessionId: string,
    pageId: string,
  ): void {
    const isPageVisible = status.active;
    log.info('Changing active session', {
      isPageVisible,
      sessionId: heroSessionId,
      pageId,
    });

    if (this.activeHeroSessionId === heroSessionId && status.focused) {
      AliveBarPositioner.focusedPageId(pageId);
    } else if (!this.restartingHeroSessionId) {
      AliveBarPositioner.blurredPageId(pageId);
    }
  }

  private static async onHeroSessionCreated(event: { session: HeroSession }): Promise<any> {
    const { session: heroSession } = event;

    const script = heroSession.options.scriptInstanceMeta?.entrypoint;
    if (!script) return;

    if (heroSession.mode === 'timetravel' || heroSession.mode === 'production') {
      return;
    }

    if (heroSession.mode === 'browserless') {
      // @ts-expect-error
      const extractSessionId = heroSession.options.extractSessionId;
      if (extractSessionId) {
        const observer = this.sessionObserversById.get(extractSessionId);
        if (observer) observer.bindExtractor(heroSession);
        return;
      }
      return;
    }

    if (heroSession.mode === 'multiverse') {
      const observer = this.sessionObserversById.get(this.activeHeroSessionId);
      observer?.onMultiverseSession(heroSession);
      return;
    }

    // ChromeAlive will only show up if specifically requested
    if (!heroSession.options.showChromeAlive) {
      return;
    }

    const sessionId = heroSession.id;
    log.info('New Hero Session Created: %s (%s)', {
      script: script.split('/').pop(),
      sessionId,
    });
    // keep alive session
    heroSession.options.sessionKeepAlive = true;
    // automatically showChrome if showChromeAlive is turned on
    heroSession.options.showChrome = true;
    heroSession.options.showChromeInteractions = true;
    // extensions need incognito disabled
    heroSession.options.disableIncognito = true;
    heroSession.options.viewport ??= { width: 0, height: 0 };
    const sessionObserver = new SessionObserver(heroSession);
    const coreServerAddress = await this.coreServerAddress;
    heroSession.bypassResourceRegistrationForHost = new URL(coreServerAddress);

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
      if (!isRestartedSessionId) {
        this.sendAppEvent('Session.loading');
      }
      AliveBarPositioner.showHeroSessionOnBounds(sessionId);
      this.events.once(sessionObserver, 'hero:updated', () => {
        this.sendAppEvent('Session.loaded');
        const plugin = HeroCorePlugin.bySessionId.get(sessionId);
        if (plugin.activePage) AliveBarPositioner.focusedPageId(plugin.activePage.id);
      });
      this.activeHeroSessionId = sessionId;
    }
  }

  private static onWsConnected(): void {
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
    const timetravel = this.sessionObserversById.get(sessionId).timetravelPlayer;
    this.sendAppEvent('Session.timetravel', {
      ...event,
      url: timetravel.activeTab.mirrorPage.page.mainFrame.url,
    });
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

  private static onSessionObserverClosed(sessionObserver: SessionObserver): void {
    const heroSessionId = sessionObserver.heroSession.id;
    this.sessionObserversById.delete(heroSessionId);
    this.events.endGroup('session');
    if (this.activeHeroSessionId === heroSessionId) {
      this.activeHeroSessionId = null;
      if (this.restartingHeroSessionId === heroSessionId) {
        this.sendAppEvent('Session.active', {
          heroSessionId: null,
          timeline: { urls: [], screenshots: [], paintEvents: [], storageEvents: [] },
          playbackState: 'restarting',
          startTime: Date.now(),
          inputBytes: 0,
          runtimeMs: 0,
          ...sessionObserver.getScriptDetails(),
        });
      } else {
        AliveBarPositioner.resetSession(heroSessionId);
        this.sendAppEvent('Session.active', null);
      }

      this.sendAppEvent('Databox.output', {
        changes: [],
        output: null,
        bytes: 0,
      });
    }
  }

  private static sendActiveSession(heroSessionId: string): void {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;

    this.sendAppEvent('Session.active', sessionObserver.getHeroSessionEvent());
  }

  private static sendDataboxUpdatedEvent(heroSessionId: string): void {
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

  private static sendAppModeEvent(heroSessionId: string): void {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;
    this.sendAppEvent('App.mode', { mode: sessionObserver.mode });
  }

  private static async launchApp(hideOnLaunch = false): Promise<void> {
    if (this.app && !this.app.killed) return;

    const args: string[] = hideOnLaunch ? ['--hide'] : [];
    if (this.coreServerAddress) {
      const coreServerAddress = await this.coreServerAddress;
      const filePath = `${extensionPath}/background.js`;
      try {
        let fileContents = await Fs.promises.readFile(filePath, 'utf8');
        fileContents = fileContents.replace(
          /__CORE_SERVER_ADDRESS__ = '.*';/,
          `__CORE_SERVER_ADDRESS__ = '${coreServerAddress}';`,
        );
        await Fs.promises.writeFile(filePath, fileContents);
      } catch (err) {
        throw new Error('Could not launch ChromeAlive! Not installed.');
      }
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

  private static onBrowserHasNoWindows(event: { browser: Browser }): void {
    // only check for headed
    if (!event.browser.engine.isHeaded) return;

    const browserId = event.browser.id;
    setTimeout(() => {
      const sessionsUsingEngine = HeroSession.sessionsWithBrowserId(browserId);
      const hasWindows = sessionsUsingEngine.some(x => x.tabsById.size > 0);
      if (!hasWindows) {
        return event.browser.close();
      }
    }, 2e3).unref();
  }

  private static async onNewBrowser(): Promise<void> {
    await this.launchApp();
  }

  private static closeApp(): void {
    log.stats('Closing Electron App');
    this.sendAppEvent('App.quit');
    this.app = null;
  }
}
