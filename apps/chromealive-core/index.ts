import HeroCore, { GlobalPool as HeroGlobalPool, Session as HeroSession } from '@ulixee/hero-core';
import IChromeAliveEvents from '@ulixee/apps-chromealive-interfaces/events';
import Debug from 'debug';
import { ChildProcess } from 'child_process';
import launchChromeAlive from '@ulixee/apps-chromealive/index';
import type Puppet from '@ulixee/hero-puppet';
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
  public static activeHeroSessionId: string;
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
    HeroGlobalPool.events.off('browser-launched', this.launchApp);
    HeroGlobalPool.events.off('all-browsers-closed', this.closeApp);
    HeroGlobalPool.events.off('session-created', this.onHeroSessionCreated);
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
    this.onHeroSessionCreated = this.onHeroSessionCreated.bind(this);
    const connection = this.getConnection();
    connection.on('connected', this.onWsConnected.bind(this));
    HeroGlobalPool.events.on('browser-launched', this.launchApp);
    HeroGlobalPool.events.on('all-browsers-closed', this.closeApp);
    HeroGlobalPool.events.on('session-created', this.onHeroSessionCreated);

    FocusedWindowCorePlugin.onVisibilityChange = this.changeActiveSessions.bind(this);
    AliveBarPositioner.getSessionDevtools = this.getSessionDevtools.bind(this);

    HeroCore.use(FocusedWindowCorePlugin);
    HeroCore.use(WindowBoundsCorePlugin);
  }

  private static onHeroSessionCreated(event: { session: HeroSession }): Promise<any> {
    const { session: heroSession } = event;
    if (this.shouldAutoShowBrowser) {
      heroSession.options.showBrowser = true;
      heroSession.options.showBrowserInteractions = true;
    }

    // if not auto-registered, check if browser is showing
    if (!heroSession.options.showBrowser) return;

    const script = heroSession.options.scriptInstanceMeta?.entrypoint;
    if (!script) return;

    debug('New Hero Session Created: %s (%s)', script.split('/').pop(), heroSession.id);
    // keep alive session
    heroSession.options.sessionKeepAlive = true;
    const sessionObserver = new SessionObserver(heroSession);
    this.sessionObserversById.set(heroSession.id, sessionObserver);
    sessionObserver.on('session:updated', this.sendActiveSession.bind(this, heroSession.id));
    sessionObserver.on('output:updated', this.sendOutput.bind(this, heroSession.id));
    this.activeHeroSessionId ??= heroSession.id;
    this.sendActiveSession(heroSession.id);
  }

  private static onWsConnected() {
    debug('ChromeAlive! Ws Connected', {
      activeHeroSessionId: this.activeHeroSessionId,
    });
    if (this.activeHeroSessionId) {
      this.sendActiveSession(this.activeHeroSessionId);
      this.sendOutput(this.activeHeroSessionId);
    }
  }

  private static sendActiveSession(heroSessionId: string) {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;
    this.sendEvent('Session.active', sessionObserver.toEvent());
  }

  private static sendOutput(heroSessionId: string) {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;
    const output = sessionObserver.getOutput();
    if (output) this.sendEvent('Output.updated', output);
  }

  private static changeActiveSessions(heroSessionId: string, pageId: string): void {
    debug('Changing active session', { heroSessionId, pageId });
    this.activeHeroSessionId = heroSessionId;
    // hide chrome alive if none are visible
    this.toggleAppVisibility(!!heroSessionId);
  }

  private static getSessionDevtools(heroSessionId: string): IDevtoolsSession {
    const sessionObserver = this.sessionObserversById.get(heroSessionId);
    if (!sessionObserver) return;

    const { heroSession } = sessionObserver;
    const page = [...heroSession.tabsById.values()].find(x => !x.isClosing)?.puppetPage;
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
    this.app?.send('exit');
    this.app?.kill('SIGTERM');
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
