import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import Log from '@ulixee/commons/lib/Logger';
import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import { ConnectionToDatastoreCore } from '@ulixee/datastore';
import DatastoreCore from '@ulixee/datastore-core';
import ExtractorInternal from '@ulixee/datastore/lib/ExtractorInternal';
import { IChromeAliveSessionApis, IDesktopAppApis } from '@ulixee/desktop-interfaces/apis';
import IAppApi from '@ulixee/desktop-interfaces/apis/IAppApi';
import IChromeAliveSessionEvents from '@ulixee/desktop-interfaces/events/IChromeAliveSessionEvents';
import IDesktopAppEvents, {
  INewHeroSessionEvent,
} from '@ulixee/desktop-interfaces/events/IDesktopAppEvents';
import HeroCore, { Session as HeroSession, Session } from '@ulixee/hero-core';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import { ConnectionToCore } from '@ulixee/net';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ITransport from '@ulixee/net/interfaces/ITransport';
import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { ICloudApis, ICloudApiTypes } from '@ulixee/platform-specification/cloud';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import { IncomingMessage } from 'http';
import { nanoid } from 'nanoid';
import WebSocket = require('ws');
import AppDevtoolsConnection from './lib/AppDevtoolsConnection';
import FullscreenHeroCorePlugin from './lib/FullscreenHeroCorePlugin';
import HeroSessionsSearch from './lib/HeroSessionsSearch';
import SessionController from './lib/SessionController';
import Workarea from './lib/Workarea';

const { log } = Log(module);

type IConnectionToDesktopClient = IConnectionToClient<IDesktopAppApis, IDesktopAppEvents>;

export default class DesktopCore {
  public sessionControllersById = new Map<string, SessionController>();
  private appConnectionsById = new Map<string, IConnectionToDesktopClient>();
  private appDevtoolsConnectionsById = new Map<string, AppDevtoolsConnection>();
  private readonly heroSessionsSearch: HeroSessionsSearch;
  private _connectionToDatastoreCore: ConnectionToDatastoreCore;

  private get connectionToDatastoreCore(): ConnectionToDatastoreCore {
    if (!this._connectionToDatastoreCore) {
      const bridge = new TransportBridge();
      this._connectionToDatastoreCore = new ConnectionToDatastoreCore(bridge.transportToCore);
      this.datastoreCore.addConnection(bridge.transportToClient);
    }
    return this._connectionToDatastoreCore;
  }

  private events = new EventSubscriber();
  private connectionToCloudCore: ConnectionToCore<ICloudApis, {}>;
  constructor(public datastoreCore: DatastoreCore, public heroCore: HeroCore) {
    this.heroSessionsSearch = new HeroSessionsSearch(heroCore);
  }

  public bindConnection(connectionToCloudCore: ConnectionToCore<ICloudApis, {}>): void {
    this.connectionToCloudCore = connectionToCloudCore;
  }

  public disconnect(): void {
    this.datastoreCore = null;
    this.connectionToCloudCore = null;
  }

  public registerWsRoutes(
    addWsRoute: (route: string | RegExp, callbackFn: IWsHandleFn, useTransport?: boolean) => any,
  ): void {
    addWsRoute(/\/desktop-devtools\?id=.+/, this.addAppDevtoolsWebsocket.bind(this), false);
    addWsRoute(/\/desktop(\?.+)?/, this.addDesktopConnection.bind(this));
    addWsRoute(/\/chromealive\/.+/, this.addChromeAliveConnection.bind(this));
  }

  public addAppDevtoolsWebsocket(ws: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url, 'http://localhost');
    const id = url.searchParams.get('id');
    if (!id) throw new Error('A ChromeAlive devtools connection was made without an id parameter.');
    const connection = new AppDevtoolsConnection(ws);
    this.appDevtoolsConnectionsById.set(id, connection);
    connection.onCloseFns.push(() => this.appDevtoolsConnectionsById.delete(id));
  }

  public async addChromeAliveConnection(
    transport: ITransport,
    request: IncomingMessage,
  ): Promise<IConnectionToClient<IChromeAliveSessionApis, IChromeAliveSessionEvents>> {
    const chromeAliveMatch = request.url.match(/\/chromealive\/([0-9a-zA-Z-_]{6,}).*/);
    if (chromeAliveMatch) {
      const heroSessionId = chromeAliveMatch[1];
      const controller = this.sessionControllersById.get(heroSessionId);

      if (controller) return controller.addConnection(transport, request) as any;
      return await this.loadSessionController(heroSessionId, transport, request);
    }
  }

  public addDesktopConnection(
    transport: ITransport,
    request: IncomingMessage,
  ): IConnectionToClient<IDesktopAppApis, IDesktopAppEvents> {
    const url = new URL(request.url, 'https://localhost');
    const connectionType = url.searchParams.get('type');
    let id: string;
    const host = request.socket.remoteAddress;
    // give local desktop special permissions. does not need to be specified
    if (
      connectionType === 'app' &&
      (host === '::1' || host === '::' || host === '127.0.0.1' || host === '::ffff:127.0.0.1')
    ) {
      id = 'local';
    } else id = nanoid(10);

    log.info('Desktop app connected', { id, host, sessionId: null });

    // Desktop initiates a connection to Core. This Core could be remote or local.
    const connection = new ConnectionToClient<IDesktopAppApis, IDesktopAppEvents>(transport, {
      'App.connect': this.onAppConnect.bind(this, id),
      'Sessions.search': this.heroSessionsSearch.search,
      'Sessions.list': this.heroSessionsSearch.list,
      // NOTE: we proxy through some core apis here just to minimize necessary connections
      'Datastores.list': this.delegateToDatastoreCore.bind(this, 'Datastores.list'),
      'Datastore.meta': this.getDatastoreMetaWithExamples.bind(this),
      'Datastore.stats': this.delegateToDatastoreCore.bind(this, 'Datastore.stats'),
      'Datastore.versions': this.delegateToDatastoreCore.bind(this, 'Datastore.versions'),
      'Datastore.creditsIssued': this.delegateToDatastoreCore.bind(this, 'Datastore.creditsIssued'),
    });

    this.appConnectionsById.set(id, connection);

    const eventId = nanoid();

    this.events.group(
      eventId,
      this.events.on(this.heroSessionsSearch, 'update', x =>
        connection.sendEvent({ data: x, eventType: 'Sessions.listUpdated' }),
      ),
      this.events.on(this.datastoreCore, 'new', x => {
        connection.sendEvent({ data: x, eventType: 'Datastore.new' });
      }),
      this.events.on(this.datastoreCore, 'stats', x => {
        connection.sendEvent({ data: x, eventType: 'Datastore.stats' });
      }),
      this.events.on(this.datastoreCore, 'stopped', x => {
        connection.sendEvent({ data: x, eventType: 'Datastore.stopped' });
      }),
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
    this.events.once(connection, 'disconnected', () => {
      this.events.endGroup(eventId);
      this.appConnectionsById.delete(id);
    });
    return connection as any;
  }

  public activatePlugin(): void {
    log.info('Registering ChromeAlive!');

    this.events.on(HeroSession.events, 'new', this.onHeroSessionCreated.bind(this));

    HeroCore.use(FullscreenHeroCorePlugin);
  }

  public async onAppConnect(
    id: string,
    args: Parameters<IAppApi['connect']>[0],
  ): ReturnType<IAppApi['connect']> {
    if (id === 'local') {
      Workarea.setHeroDefaultScreen(args.workarea);
    }

    const { nodes } = await this.delegateToCloudCore('Cloud.status', {});

    return { id, cloudNodes: nodes };
  }

  public async shutdown(): Promise<void> {
    log.info('Shutting down Desktop Core!');

    for (const connection of this.appConnectionsById.values()) {
      connection.sendEvent({ eventType: 'App.quit', data: null });
    }
    this.appDevtoolsConnectionsById.clear();
    this.events.close();
    for (const controller of this.sessionControllersById.values()) {
      await controller.close();
    }
    this.sessionControllersById.clear();
    await this.heroSessionsSearch.close();
  }

  private async onHeroSessionCreated(event: { session: HeroSession }): Promise<void> {
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

    const script = heroSession.options.scriptInvocationMeta?.entrypoint;
    if (!script) return;

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
    try {
      const originalController = this.sessionControllersById.get(
        heroSession.options.resumeSessionId,
      );
      originalController?.setResuming(heroSession.options.resumeSessionId);
      if (originalController) return;

      const { sessionController, appConnectionId } = this.createSessionController(
        heroSession.db,
        heroSession.options,
      );
      if (!sessionController) return;
      sessionController.bindLiveSession(heroSession);

      const appConnection = this.appConnectionsById.get(appConnectionId);
      await appConnection.sendEvent({
        eventType: 'Session.opened',
        data: {
          heroSessionId: heroSession.id,
          options: heroSession.options,
          dbPath: heroSession.db.path,
          startDate: new Date(heroSession.createdTime),
        },
      });
    } catch (error) {
      log.error('ERROR launching ChromeAlive for Session', { error, sessionId });
    }
  }

  private createSessionController(
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
    const sessionController = new SessionController(
      db,
      options,
      this.datastoreCore.options.datastoresDir,
      devtoolsConnection,
    );
    this.sessionControllersById.set(sessionId, sessionController);
    this.events.once(sessionController, 'closed', () => {
      this.sessionControllersById.delete(sessionId);
    });

    return { sessionController, appConnectionId };
  }

  private delegateToDatastoreCore<TCommand extends keyof IDatastoreApiTypes & string>(
    command: TCommand,
    args: IDatastoreApiTypes[TCommand]['args'],
  ): Promise<IDatastoreApiTypes[TCommand]['result']> {
    return this.connectionToDatastoreCore.sendRequest({
      command,
      args: [args] as any,
    });
  }

  private async getDatastoreMetaWithExamples(
    args: IDatastoreApiTypes['Datastore.meta']['args'],
  ): Promise<
    IDatastoreApiTypes['Datastore.meta']['result'] & {
      examplesByEntityName: { [name: string]: { formatted: string; args: Record<string, any> } };
    }
  > {
    const meta = (await this.delegateToDatastoreCore('Datastore.meta', args)) as Awaited<
      ReturnType<DesktopCore['getDatastoreMetaWithExamples']>
    >;
    meta.examplesByEntityName = {};
    for (const [name, entry] of [
      ...Object.entries(meta.crawlersByName),
      ...Object.entries(meta.extractorsByName),
    ]) {
      meta.examplesByEntityName[name] = ExtractorInternal.createExampleCall(
        name,
        entry.schemaAsJson,
      );
    }
    for (const name of Object.keys(meta.tablesByName)) {
      meta.examplesByEntityName[name] = {
        formatted: name,
        args: {},
      };
    }
    return meta;
  }

  private delegateToCloudCore<TCommand extends keyof ICloudApiTypes & string>(
    command: TCommand,
    args: ICloudApiTypes[TCommand]['args'],
  ): Promise<ICloudApiTypes[TCommand]['result']> {
    return this.connectionToCloudCore.sendRequest({
      command,
      args: [args] as any,
    });
  }

  private async loadSessionController(
    heroSessionId: string,
    transport: ITransport,
    request: IncomingMessage,
  ): Promise<IConnectionToClient<any, any>> {
    const requestUrl = new URL(request.url, 'http://localhost');
    const customDbPath = requestUrl.searchParams.get('path');

    const db = await this.heroCore.sessionRegistry.retain(heroSessionId, customDbPath);
    const dbSession = db.session.get();
    const options = await Session.restoreOptionsFromSessionRecord({}, heroSessionId, this.heroCore);

    options.scriptInvocationMeta = {
      entrypoint: dbSession.scriptEntrypoint,
      runId: dbSession.scriptRunId,
      productId: dbSession.scriptProductId,
      version: dbSession.scriptVersion,
      runtime: dbSession.scriptRuntime,
      workingDirectory: dbSession.workingDirectory,
      execArgv: dbSession.scriptExecArgv,
      execPath: dbSession.scriptExecPath,
    };
    const { sessionController } = this.createSessionController(db, options);
    const apiConnection = sessionController.addConnection(transport, request);

    sessionController.loadFromDb().catch(error => {
      log.error('ERROR loading session from database', {
        error,
        sessionId: heroSessionId,
      });
    });
    return apiConnection;
  }

  private broadcastAppEvent<T extends keyof IDesktopAppEvents & string>(
    eventType: T,
    data: IDesktopAppEvents[T],
  ): void {
    for (const client of this.appConnectionsById.values()) {
      client.sendEvent({ eventType, data });
    }
  }
}
type IWsHandleFn = (
  wsOrTransport: WebSocket | ITransport,
  request: IncomingMessage,
  params: string[],
) => void;
