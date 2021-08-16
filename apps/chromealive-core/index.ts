import Core, { GlobalPool, Session } from '@ulixee/hero-core';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import Debug from 'debug';
import { ChildProcess } from 'child_process';
import launchChromeAlive from '@ulixee/apps-chromealive/index';
import Puppet from '@ulixee/hero-puppet';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';
import FocusedWindowCorePlugin from './hero-plugins/FocusedWindowCorePlugin';
import WindowBoundsCorePlugin from './hero-plugins/WindowBoundsCorePlugin';
import SessionObserver from './lib/SessionObserver';
import ConnectionToClient from './lib/ConnectionToClient';
import activateChromeExtension from './lib/activateChromeExtension';
import AliveBarPositioner from './lib/AliveBarPositioner';

const debug = Debug('ulixee:chromealive');

export default class ChromeAliveCore {
  public static sessionObserversById = new Map<string, SessionObserver>();
  public static activeSessionId: string;
  private static connection: ConnectionToClient;
  private static shouldAutoShowBrowser = false;
  private static app: ChildProcess;
  private static coreServerAddress?: Promise<string>;

  public static setCoreServerAddress(address: Promise<string>) {
    this.coreServerAddress = address;
  }

  public static getConnection(): ConnectionToClient {
    this.connection ??= new ConnectionToClient();
    return this.connection;
  }

  public static shutdown() {
    debug('Shutting down ChromeAlive!');
    this.closeApp();
    GlobalPool.events.off('browser-launched', this.launchApp);
    GlobalPool.events.off('all-browsers-closed', this.closeApp);
    GlobalPool.events.off('session-created', this.onSessionCreated);
    FocusedWindowCorePlugin.onVisibilityChange = null;
    AliveBarPositioner.getSessionDevtools = null;
    this.getConnection().close();
    for (const observer of this.sessionObserversById.values()) {
      observer.close();
    }
    this.sessionObserversById.clear();
  }

  public static register(isNodeRegisteredModule = false) {
    debug('Registering ChromeAlive!');
    if (isNodeRegisteredModule === true) {
      this.shouldAutoShowBrowser = true;
    }

    this.launchApp = this.launchApp.bind(this);
    this.closeApp = this.closeApp.bind(this);
    this.onSessionCreated = this.onSessionCreated.bind(this);
    const connection = this.getConnection();
    connection.on('connected', this.onWsConnected.bind(this));
    GlobalPool.events.on('browser-launched', this.launchApp);
    GlobalPool.events.on('all-browsers-closed', this.closeApp);
    GlobalPool.events.on('session-created', this.onSessionCreated);

    FocusedWindowCorePlugin.onVisibilityChange = this.changeActiveSessions.bind(this);
    AliveBarPositioner.getSessionDevtools = this.getSessionDevtools.bind(this);

    Core.use(FocusedWindowCorePlugin);
    Core.use(WindowBoundsCorePlugin);
  }

  private static onSessionCreated(event: { session: Session }): Promise<any> {
    const { session } = event;
    if (this.shouldAutoShowBrowser) {
      session.options.showBrowser = true;
      session.options.showBrowserInteractions = true;
    }

    // if not auto-registered, check if browser is showing
    if (!session.options.showBrowser) return;

    const script = session.options.scriptInstanceMeta?.entrypoint;
    if (!script) return;

    debug('New Session Created: %s (%s)', script.split('/').pop(), session.id);
    // keep alive session
    session.options.sessionKeepAlive = true;
    const sessionObserver = new SessionObserver(session);
    this.sessionObserversById.set(session.id, sessionObserver);
    sessionObserver.on('session:updated', this.updateActiveSession.bind(this, session.id));
    this.updateActiveSession(session.id);
  }

  private static onWsConnected() {
    debug('ChromeAlive! Ws Connected', {
      activeSessionId: this.activeSessionId,
    });
    if (this.activeSessionId) this.updateActiveSession(this.activeSessionId);
  }

  private static updateActiveSession(sessionId: string) {
    const sessionObserver = this.sessionObserversById.get(sessionId);
    if (!sessionObserver) return;
    this.sendEvent('Session.active', sessionObserver.toEvent());
  }

  private static changeActiveSessions(sessionId: string, pageId: string): void {
    debug('Changing active session', { sessionId, pageId });
    this.activeSessionId = sessionId;
    // hide chrome alive if none are visible
    this.toggleAppVisibility(!!sessionId);
  }

  private static getSessionDevtools(sessionId: string): IDevtoolsSession {
    const sessionObserver = this.sessionObserversById.get(sessionId);
    if (!sessionObserver) return;

    const { session } = sessionObserver;
    const page = [...session.tabsById.values()].find(x => !x.isClosing)?.puppetPage;
    return page.devtoolsSession;
  }

  private static async launchApp(event: { puppet: Puppet }): Promise<void> {
    const args: string[] = [];
    if (this.coreServerAddress) {
      args.push(`--coreServerAddress=${await this.coreServerAddress}`);
    }

    this.app = launchChromeAlive(...args);
    debug('Launched Electron App', {
      file: this.app?.spawnfile,
      args: this.app?.spawnargs,
    });
    await activateChromeExtension(event.puppet);
  }

  private static closeApp(): void {
    debug('Closing Electron App');
    this.sendEvent('App.quit');
    this.app?.kill();
    this.app = null;
  }

  private static toggleAppVisibility(show: boolean): void {
    if (show) {
      this.sendEvent('App.show');
    } else {
      this.sendEvent('App.hide');
    }
  }

  private static sendEvent<T extends keyof IChromeAliveEvents>(
    eventType: T,
    data: IChromeAliveEvents[T] = null,
  ) {
    this.getConnection().sendEvent({ eventType, data });
  }
}
