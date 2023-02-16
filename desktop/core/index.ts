import HeroCore, { Session, Session as HeroSession } from '@ulixee/hero-core';
import Log from '@ulixee/commons/lib/Logger';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import ITransportToClient from '@ulixee/net/interfaces/ITransportToClient';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import { IncomingMessage } from 'http';
import { nanoid } from 'nanoid';
import IAppApi from '@ulixee/desktop-interfaces/apis/IAppApi';
import { IChromeAliveSessionApis, IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import IDesktopAppEvents, {
  INewHeroSessionEvent,
} from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import WebSocket = require('ws');
import SessionController from './lib/SessionController';
import FullscreenHeroCorePlugin from './lib/FullscreenHeroCorePlugin';
import Workarea from './lib/Workarea';
import AppDevtoolsConnection from './lib/AppDevtoolsConnection';
import HeroSessionsSearch from './lib/HeroSessionsSearch';

const { log } = Log(module);

type IConnectionToDesktopClient = IConnectionToClient<IDesktopAppApis, IDesktopAppEvents>;

export default class DesktopCore {
  public static sessionControllersById = new Map<string, SessionController>();
  public static minerAddress?: Promise<string>;
  private static appConnectionsById = new Map<string, IConnectionToDesktopClient>();
  private static appDevtoolsConnectionsById = new Map<string, AppDevtoolsConnection>();
  private static heroSessionsSearch = new HeroSessionsSearch();

  private static events = new EventSubscriber();

  public static setMinerAddress(address: Promise<string>): void {
    this.minerAddress = address;
  }

  public static addAppDevtoolsWebsocket(ws: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url, 'http://localhost');
    const id = url.searchParams.get('id');
    if (!id) throw new Error('A ChromeAlive devtools connection was made without an id parameter.');
    const connection = new AppDevtoolsConnection(ws);
    this.appDevtoolsConnectionsById.set(id, connection);
    connection.onCloseFns.push(() => this.appDevtoolsConnectionsById.delete(id));
  }

  public static addChromeAliveConnection(
    transport: ITransportToClient<IChromeAliveSessionApis>,
    request: IncomingMessage,
  ): IConnectionToClient<IChromeAliveSessionApis, IChromeAliveSessionEvents> {
    const chromeAliveMatch = request.url.match(/\/chromealive\/([0-9a-zA-Z-_]{6,21}).*/);
    if (chromeAliveMatch) {
      const heroSessionId = chromeAliveMatch[1];
      const controller = this.sessionControllersById.get(heroSessionId);

      if (controller) return controller.addConnection(transport, request) as any;
      return this.loadSessionController(heroSessionId, transport, request);
    }
  }

  public static addDesktopConnection(
    transport: ITransportToClient<IDesktopAppApis>,
    request: IncomingMessage,
  ): IConnectionToClient<IDesktopAppApis, IDesktopAppEvents> {
    let id: string;
    const host = request.socket.remoteAddress;
    // give local desktop special permissions. does not need to be specified
    if (host === '::1' || host === '::' || host === '127.0.0.1' || host === '::ffff:127.0.0.1') {
      id = 'local';
    } else id = nanoid(10);

    log.info('Desktop app connected', { id, host, sessionId: null });

    // Desktop initiates a connection to Core. This Core could be remote or local
    const connection = new ConnectionToClient(transport, {
      'App.connect': this.onAppConnect.bind(this, id),
      'Sessions.search': this.heroSessionsSearch.search,
      'Sessions.list': this.heroSessionsSearch.list,
    });

    this.appConnectionsById.set(id, connection);

    const eventId = nanoid();

    this.events.group(
      eventId,
      this.events.on(this.heroSessionsSearch, 'update', x =>
        connection.sendEvent({ data: x, eventType: 'Sessions.listUpdated' }),
      ),
      this.events.on(connection, 'request', msg => {
        log.stats(`${msg.request.command} (${msg.request?.messageId})`, {
          request: msg.request,
          sessionId: null,
        });
      }),
      this.events.on(connection, 'event', msg => {
        log.stats(msg.event.eventType, {
          ...msg,
          sessionId: null,
        });
      }),
      this.events.on(connection, 'response', msg => {
        log.info(`${msg.request.command} response (${msg.request?.messageId})`, {
          response: msg.response,
          sessionId: null,
        });
      }),
    );
    this.events.once(connection, 'disconnect', () => {
      this.events.endGroup(eventId);
      this.appConnectionsById.delete(id);
    });
    return connection as any;
  }

  public static activatePlugin(): void {
    log.info('Registering ChromeAlive!');

    this.events.on(HeroSession.events, 'new', this.onHeroSessionCreated.bind(this));

    HeroCore.use(FullscreenHeroCorePlugin);
  }

  public static onAppConnect(
    id: string,
    args: Parameters<IAppApi['connect']>[0],
  ): Promise<{ id: string }> {
    if (id === 'local') {
      Workarea.setHeroDefaultScreen(args.workarea);
    }
    return Promise.resolve({ id });
  }

  public static async shutdown(): Promise<void> {
    log.info('Shutting down ChromeAlive!');

    for (const connection of this.appConnectionsById.values()) {
      connection.sendEvent({ eventType: 'App.quit', data: null });
    }
    this.appDevtoolsConnectionsById.clear();
    this.events.close();
    for (const controller of this.sessionControllersById.values()) {
      await controller.close();
    }
    this.sessionControllersById.clear();
  }

  private static async onHeroSessionCreated(event: { session: HeroSession }): Promise<void> {
    const { session: heroSession } = event;
    const sessionId = heroSession.id;

    const newSessionEvent: INewHeroSessionEvent = {
      dbPath: heroSession.db.path,
      heroSessionId: sessionId,
      options: heroSession.options,
      startDate: new Date(heroSession.createdTime),
    };

    this.broadcastAppEvent('Session.created', newSessionEvent);
    this.heroSessionsSearch.onNewSession(heroSession);

    const script = heroSession.options.scriptInstanceMeta?.entrypoint;
    if (!script) return;

    if (heroSession.mode === 'timetravel' || heroSession.mode === 'production') {
      return;
    }

    if (heroSession.options.resumeSessionId || heroSession.options.replaySessionId) {
      SourceMapSupport.resetCache();
    }

    if (heroSession.mode === 'browserless') {
      const replaySessionId = heroSession.options.replaySessionId;
      if (replaySessionId) {
        const observer = this.sessionControllersById.get(replaySessionId);
        if (observer) observer.bindExtractor(heroSession);
        return;
      }
      return;
    }

    // ChromeAlive will only show up if specifically requested
    if (!heroSession.options.showChromeAlive) {
      return;
    }

    log.info('New Hero Session Created: %s (%s)', {
      script: script.split('/').pop(),
      sessionId,
    });
    // keep alive session
    heroSession.options.sessionKeepAlive = true;

    const originalController = this.sessionControllersById.get(heroSession.options.resumeSessionId);
    originalController?.setResuming(heroSession.options.resumeSessionId);
    if (originalController) return;

    const { sessionController, appConnectionId } = this.createSessionController(
      heroSession.db,
      heroSession.options,
    );
    if (!sessionController) return;
    sessionController.bindLiveSession(heroSession);

    await this.sendReadyEvent(
      appConnectionId,
      sessionId,
      heroSession.options,
      heroSession.db.path,
      new Date(heroSession.createdTime),
    );
  }

  private static createSessionController(
    db: SessionDb,
    options: ISessionCreateOptions,
  ): { sessionController: SessionController; appConnectionId: string } {
    const appConnectionId = options.desktopConnectionId ?? 'local';
    if (!this.appDevtoolsConnectionsById.has(appConnectionId)) {
      console.warn('showChromeAlive requested for Hero, but no Desktops available');
      return { sessionController: null, appConnectionId };
    }

    const sessionId = db.sessionId;
    const devtoolsConnection = this.appDevtoolsConnectionsById.get(appConnectionId);
    const sessionController = new SessionController(db, options, devtoolsConnection);
    this.sessionControllersById.set(sessionId, sessionController);
    this.events.once(sessionController, 'closed', () => {
      this.sessionControllersById.delete(sessionId);
    });

    return { sessionController, appConnectionId };
  }

  private static loadSessionController(
    heroSessionId: string,
    transport: ITransportToClient<any>,
    request: IncomingMessage,
  ): IConnectionToClient<any, any> {
    const db = SessionDb.getCached(heroSessionId, true);
    const dbSession = db.session.get();
    const options = Session.restoreOptionsFromSessionRecord({}, heroSessionId);

    options.scriptInstanceMeta = {
      id: dbSession.scriptInstanceId,
      workingDirectory: dbSession.workingDirectory,
      entrypoint: dbSession.scriptEntrypoint,
      startDate: dbSession.scriptStartDate,
      execArgv: dbSession.scriptExecArgv,
      execPath: dbSession.scriptExecPath,
    };
    const { sessionController, appConnectionId } = this.createSessionController(db, options);
    const apiConnection = sessionController.addConnection(transport, request);

    this.sendReadyEvent(
      appConnectionId,
      db.sessionId,
      options,
      db.path,
      new Date(dbSession.startDate),
    );
    sessionController.loadFromDb().catch(error => {
      log.error('ERROR loading session from database', {
        error,
        sessionId: heroSessionId,
      });
    });
    return apiConnection;
  }

  private static sendReadyEvent(
    appConnectionId: string,
    heroSessionId: string,
    options: ISessionCreateOptions,
    dbPath: string,
    startDate: Date,
  ): void {
    const appConnection = this.appConnectionsById.get(appConnectionId);
    appConnection.sendEvent({
      eventType: 'Session.opened',
      data: { heroSessionId, options, dbPath, startDate },
    });
  }

  private static broadcastAppEvent<T extends keyof IDesktopAppEvents & string>(
    eventType: T,
    data: IDesktopAppEvents[T],
  ): void {
    for (const client of this.appConnectionsById.values()) {
      client.sendEvent({ eventType, data });
    }
  }
}
