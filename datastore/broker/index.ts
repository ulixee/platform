import '@ulixee/commons/lib/SourceMapSupport';
import { RoutableServer } from '@ulixee/cloud';
import Logger from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import { isPortInUse } from '@ulixee/commons/lib/utils';
import staticServe from '@ulixee/platform-utils/lib/staticServe';
import DatastoreApiClients from '@ulixee/datastore/lib/DatastoreApiClients';
import LocalchainWithSync from '@ulixee/datastore/payments/LocalchainWithSync';
import { BalanceSyncResult } from '@argonprotocol/localchain';
import { WsTransportToClient } from '@ulixee/net';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import ApiRegistry from '@ulixee/net/lib/ApiRegistry';
import * as Path from 'node:path';
import DatabrokerDb from './db';
import DatastoreWhitelistDb from './db/DatastoreWhitelistDb';
import AdminApiEndpoints, { TAdminApis } from './endpoints/AdminApiEndpoints';
import DatabrokerCreateChannelHold from './endpoints/Databroker.createChannelHold';
import DatabrokerGetBalance from './endpoints/Databroker.getBalance';
import Env from './env';
import IDatabrokerApiContext from './interfaces/IDatabrokerApiContext';
import IDatabrokerCoreConfigureOptions from './interfaces/IDatabrokerCoreConfigureOptions';

const { log } = Logger(module);

const adminDist = Path.join(__dirname, 'admin-ui');

export default class DataBroker {
  #server: RoutableServer;
  #adminServer: RoutableServer;
  #whitelistDb: DatastoreWhitelistDb;
  #db: DatabrokerDb;
  #datastoreApiClients = new DatastoreApiClients();
  #localchain: LocalchainWithSync;
  #isStarted = new Resolvable<void>();

  public apiRegistry = new ApiRegistry<IDatabrokerApiContext>([
    DatabrokerCreateChannelHold,
    DatabrokerGetBalance,
  ]);

  public adminApis = new AdminApiEndpoints();

  public get host(): Promise<string> {
    return this.#server.host;
  }

  public get adminHost(): Promise<string> {
    return this.#adminServer.host;
  }

  constructor(readonly configuration: IDatabrokerCoreConfigureOptions) {
    this.#db = new DatabrokerDb(configuration.storageDir);
    this.#whitelistDb = new DatastoreWhitelistDb(configuration.storageDir);

    this.#localchain = new LocalchainWithSync(configuration.localchainConfig);
    this.#localchain.on('sync', this.onLocalchainSync.bind(this));
    void this.#localchain.load().then(() => this.#isStarted.resolve(), this.#isStarted.reject);

    this.apiRegistry.apiHandlerMetadataFn = (_apiRequest, _logger, remoteId) =>
      this.getApiContext(remoteId);
    this.#server = new RoutableServer(this.#isStarted.promise);
    this.#server.addHttpRoute(
      /(Databroker\..+)/,
      'POST',
      this.apiRegistry.handleHttpRoute.bind(this.apiRegistry),
    );

    this.#adminServer = new RoutableServer(this.#isStarted.promise);
    const fileServer = staticServe(adminDist, adminDist.includes('build/') ? 0 : 3600 * 24);
    this.#adminServer.addHttpRoute(/.*/, 'GET', (req, res) => {
      // redirect non files back to index.html
      if (!Path.extname(req.url)) {
        req.url = '/';
      }
      void fileServer(req, res).catch(() => null);
    });
    this.#adminServer.addWsRoute('/', (ws, req) => {
      const transport = new WsTransportToClient(ws, req);
      const context = this.getApiContext(transport.remoteId);

      const connection: IConnectionToClient<TAdminApis, any> = this.adminApis.addConnection(
        transport,
        context,
      );
      const logger = context.logger;
      connection.on('response', ({ response, request, metadata }) => {
        logger.info(`admin/${request.command} (${request.messageId})`, {
          args: request.args?.[0],
          response: response.data,
          ...metadata,
        });
      });
    });

    ShutdownHandler.register(this.close.bind(this));
  }

  public async close(): Promise<void> {
    log.info('DataBroker closing');
    ShutdownHandler.unregister(this.close);
    await Promise.allSettled([
      ...[...this.adminApis.connections].map(x => x.disconnect()),
      this.#server.close(),
      this.#adminServer.close(),
      this.#localchain.close(),
      this.#db.close(),
      this.#whitelistDb.close(),
    ]);
  }

  public async onLocalchainSync(sync: BalanceSyncResult): Promise<void> {
    for (const notarization of sync.channelHoldNotarizations) {
      for (const channelHold of await notarization.channelHolds) {
        try {
          this.#db.transaction(() => {
            const [organizationId, holdAmount, change] =
              this.#db.channelHolds.updateSettlementReturningChange(
                channelHold.id,
                channelHold.settledAmount,
                Date.now(),
              );
            this.#db.organizations.settle(organizationId, change, holdAmount);
          });
        } catch (error) {
          log.error('Error updating settlement in db after finalized in localchain', {
            error,
            channelHoldId: channelHold.id,
            settledAmount: channelHold.settledAmount,
          } as any);
        }
      }
    }
  }

  public async listen(port = 0, hostname = 'localhost'): Promise<void> {
    if (!port && !Env.isTestEnv) {
      if (!(await isPortInUse(1814))) port = 1814;
    }
    await this.#server.listen({ port, host: hostname });
    await this.#isStarted.promise;
  }

  public async listenAdmin(port: number): Promise<void> {
    if (!port && !Env.isTestEnv) {
      if (!(await isPortInUse(18171))) port = 18171;
    }
    await this.#adminServer.listen({ port, host: 'localhost' });
  }

  public getApiContext(remoteId: string): IDatabrokerApiContext {
    return {
      logger: log.createChild(module, { remote: remoteId }),
      db: this.#db,
      datastoreWhitelist: this.#whitelistDb,
      configuration: this.configuration,
      datastoreApiClients: this.#datastoreApiClients,
      localchain: this.#localchain,
    };
  }
}
