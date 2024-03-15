import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import type ILocalUserProfile from '@ulixee/datastore/interfaces/ILocalUserProfile';
import { IWallet } from '@ulixee/datastore/interfaces/IPaymentService';
import IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import CreditPaymentService from '@ulixee/datastore/payments/CreditPaymentService';
import {
  IArgonFileMeta,
  IDatastoreResultItem,
  IDesktopAppPrivateApis,
  TCredit,
} from '@ulixee/desktop-interfaces/apis';
import { ICloudConnected } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import IDesktopAppPrivateEvents from '@ulixee/desktop-interfaces/events/IDesktopAppPrivateEvents';
import { LocalchainOverview } from '@ulixee/localchain';
import { ConnectionToClient, WsTransportToClient } from '@ulixee/net';
import IConnectionToClient from '@ulixee/net/interfaces/IConnectionToClient';
import IArgonFile, { ArgonFileSchema } from '@ulixee/platform-specification/types/IArgonFile';
import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';
import Identity from '@ulixee/platform-utils/lib/Identity';
import { dialog, Menu, WebContents } from 'electron';
import { IncomingMessage } from 'http';
import { nanoid } from 'nanoid';
import * as Os from 'os';
import * as Path from 'path';
import WebSocket = require('ws');
import ApiManager from './ApiManager';
import ArgonFile from './ArgonFile';

const { version: packageVersion } = require('../package.json');

const argIconPath = Path.resolve(__dirname, '..', 'assets', 'arg.png');

export interface IOpenReplay {
  cloudAddress: string;
  heroSessionId: string;
  dbPath: string;
}

export default class PrivateDesktopApiHandler extends TypedEventEmitter<{
  'open-replay': IOpenReplay;
}> {
  public Apis: IDesktopAppPrivateApis = {
    'Argon.importSend': this.importArgons.bind(this),
    'Argon.acceptRequest': this.acceptArgonRequest.bind(this),
    'Argon.send': this.createArgonsToSendFile.bind(this),
    'Argon.request': this.createArgonsToRequestFile.bind(this),
    'Argon.dropFile': this.onArgonFileDrop.bind(this),
    'Argon.showFileContextMenu': this.showContextMenu.bind(this),
    'Argon.transferFromMainchain': this.transferArgonsFromMainchain.bind(this),
    'Argon.transferToMainchain': this.transferArgonsToMainchain.bind(this),
    'Credit.create': this.createCredit.bind(this),
    'Credit.save': this.saveCredit.bind(this),
    'Cloud.findAdminIdentity': this.findCloudAdminIdentity.bind(this),
    'Datastore.setAdminIdentity': this.setDatastoreAdminIdentity.bind(this),
    'Datastore.findAdminIdentity': this.findAdminIdentity.bind(this),
    'Datastore.getInstalled': this.getInstalledDatastores.bind(this),
    'Datastore.query': this.queryDatastore.bind(this),
    'Datastore.deploy': this.deployDatastore.bind(this),
    'Datastore.install': this.installDatastore.bind(this),
    'Datastore.uninstall': this.uninstallDatastore.bind(this),
    'Desktop.getAdminIdentities': this.getAdminIdentities.bind(this),
    'Desktop.getCloudConnections': this.getCloudConnections.bind(this),
    'Desktop.connectToPrivateCloud': this.connectToPrivateCloud.bind(this),
    'GettingStarted.getCompletedSteps': this.gettingStartedProgress.bind(this),
    'GettingStarted.completeStep': this.completeGettingStartedStep.bind(this),
    'Session.openReplay': this.openReplay.bind(this),
    'User.getQueries': this.getQueries.bind(this),
    'User.getWallet': this.getWallet.bind(this),
    'User.createAccount': this.createAccount.bind(this),
  } as const;

  public Events: IDesktopAppPrivateEvents;

  private connectionToClient: IConnectionToClient<this['Apis'], this['Events']>;
  private waitForConnection = new Resolvable<void>();
  private events = new EventSubscriber();

  constructor(private readonly apiManager: ApiManager) {
    super();

    this.events.on(apiManager, 'new-cloud-address', this.onNewCloudAddress.bind(this));
    this.events.on(apiManager, 'deployment', this.onDeployment.bind(this));
    this.events.on(apiManager, 'query', this.onQuery.bind(this));
  }

  public onConnection(ws: WebSocket, req: IncomingMessage): void {
    if (this.connectionToClient) {
      void this.connectionToClient.disconnect();
    }
    this.waitForConnection.resolve();
    const transport = new WsTransportToClient(ws, req);
    this.connectionToClient = new ConnectionToClient(transport, this.Apis);
    const promise = this.waitForConnection;
    this.events.once(this.connectionToClient, 'disconnected', () => {
      if (this.waitForConnection === promise) this.waitForConnection = new Resolvable<void>();
    });
  }

  public async close(): Promise<void> {
    try {
      await this.connectionToClient?.disconnect();
    } catch {}
    this.events.close();
  }

  public async getWallet(): Promise<IWallet> {
    return this.apiManager.getWallet();
  }

  public async completeGettingStartedStep(step: string): Promise<void> {
    if (!this.apiManager.localUserProfile.gettingStartedCompletedSteps.includes(step)) {
      this.apiManager.localUserProfile.gettingStartedCompletedSteps.push(step);
      await this.apiManager.localUserProfile.save();
    }
  }

  public gettingStartedProgress(): string[] {
    return this.apiManager.localUserProfile.gettingStartedCompletedSteps ?? [];
  }

  public async onArgonFileDrop(path: string): Promise<void> {
    const argonFile = await ArgonFile.readFromPath(path);
    await this.onArgonFileOpened(argonFile);
  }

  public async createAccount(request: {
    name: string;
    suri?: string;
    password?: string;
  }): Promise<LocalchainOverview> {
    return await this.apiManager.localchainManager.createAccount(
      request.name,
      request.suri,
      request.password,
    );
  }

  public async createArgonsToSendFile(request: {
    milligons: bigint;
    fromAddress?: string;
    toAddress?: string;
  }): Promise<IArgonFileMeta> {
    return this.apiManager.localchainManager.createArgonsToSendFile(request);
  }

  public async transferArgonsFromMainchain(request: {
    milligons: bigint;
    address?: string;
  }): Promise<void> {
    await this.apiManager.localchainManager.transferMainchainToLocal(
      request.address,
      request.milligons,
    );
  }

  public async transferArgonsToMainchain(request: {
    milligons: bigint;
    address?: string;
  }): Promise<void> {
    return this.apiManager.localchainManager.transferLocalToMainchain(
      request.address,
      request.milligons,
    );
  }

  public async createArgonsToRequestFile(request: {
    milligons: bigint;
    sendToMyAddress?: string;
  }): Promise<IArgonFileMeta> {
    return this.apiManager.localchainManager.createArgonsToRequestFile(request);
  }

  public async acceptArgonRequest(request: {
    argonFile: IArgonFile;
    fundWithAddress?: string;
  }): Promise<void> {
    const argonFile = ArgonFileSchema.parse(request.argonFile);
    if (argonFile.credit) {
      await this.saveCredit({ credit: argonFile.credit });
      return;
    }
    return this.apiManager.localchainManager.acceptArgonRequest(argonFile, request.fundWithAddress);
  }

  public async importArgons(claim: { argonFile: IArgonFile }): Promise<void> {
    const argonFile = ArgonFileSchema.parse(claim.argonFile);
    if (argonFile.credit) {
      await this.saveCredit({ credit: argonFile.credit });
      return;
    }
    return this.apiManager.localchainManager.importArgons(argonFile);
  }

  public getInstalledDatastores(): ILocalUserProfile['installedDatastores'] {
    return this.apiManager.localUserProfile.installedDatastores;
  }

  public getQueries(): IQueryLogEntry[] {
    return Object.values(this.apiManager.queryLogWatcher.queriesById);
  }

  public queryDatastore(args: {
    id: string;
    version: string;
    cloudHost: string;
    query: string;
  }): Promise<IQueryLogEntry> {
    const { id, version, query, cloudHost } = args;
    const client = this.apiManager.getDatastoreClient(cloudHost);
    const queryId = nanoid(12);
    const date = new Date();
    void client.query(id, version, query, { queryId });
    return Promise.resolve({
      date,
      query,
      input: [],
      id,
      version,
      queryId,
    } as any);
  }

  public async deployDatastore(args: {
    id: string;
    version: string;
    cloudHost: string;
    cloudName: string;
  }): Promise<void> {
    const { id, version, cloudName, cloudHost } = args;
    const adminIdentity = this.apiManager.localUserProfile.getAdminIdentity(id, cloudName);

    if (!cloudHost) throw new Error('No cloud host available.');
    const apiClient = new DatastoreApiClient(cloudHost);
    if (version.includes(DatastoreManifest.TemporaryIdPrefix)) {
      throw new Error('This Datastore has only been started. You need to deploy it.');
    }
    const download = await apiClient.download(id, version, adminIdentity);
    await apiClient.upload(download.compressedDbx, { forwardedSignature: download });
  }

  public async installDatastore(arg: {
    cloudHost: string;
    id: string;
    version: string;
  }): Promise<void> {
    const { cloudHost, id, version } = arg;
    await this.apiManager.localUserProfile.installDatastore(cloudHost, id, version);
  }

  public async uninstallDatastore(arg: {
    cloudHost: string;
    id: string;
    version: string;
  }): Promise<void> {
    const { cloudHost, id, version } = arg;
    await this.apiManager.localUserProfile.uninstallDatastore(cloudHost, id, version);
  }

  public async setDatastoreAdminIdentity(
    datastoreId: string,
    adminIdentityPath: string,
  ): Promise<string> {
    return await this.apiManager.localUserProfile.setDatastoreAdminIdentity(
      datastoreId,
      adminIdentityPath,
    );
  }

  public async saveCredit(arg: { credit: TCredit }): Promise<void> {
    const credit = await CreditPaymentService.storeCreditFromUrl(
      arg.credit.datastoreUrl,
      arg.credit.microgons,
      await this.apiManager.localchainManager.getDatastoreHostLookup(),
    );
    this.apiManager.paymentService.addCredit(credit);
  }

  public async createCredit(args: {
    datastore: Pick<IDatastoreResultItem, 'id' | 'version' | 'name' | 'scriptEntrypoint'>;
    cloud: string;
    argons: number;
  }): Promise<IArgonFileMeta> {
    const { argons, datastore } = args;
    const address = new URL(this.apiManager.getCloudAddressByName(args.cloud));
    const adminIdentity = this.apiManager.localUserProfile.getAdminIdentity(
      datastore.id,
      args.cloud,
    );
    if (!adminIdentity) {
      throw new Error("Sorry, we couldn't find the AdminIdentity for this cloud.");
    }
    const microgons = argons * Number(ArgonUtils.MicrogonsPerArgon);
    const client = new DatastoreApiClient(address.href);
    try {
      const { id, remainingCredits, secret } = await client.createCredits(
        datastore.id,
        datastore.version,
        microgons,
        adminIdentity,
      );

      return {
        file: {
          version: packageVersion,
          credit: {
            datastoreUrl: `ulx://${id}:${secret}@${address.host}/${datastore.id}@v${datastore.version}`,
            microgons: remainingCredits,
          },
        },
        name: `₳${argons} at ${
          (datastore.name ?? datastore.scriptEntrypoint)?.replace(/[.\\/]/g, '-') ??
          'a Ulixee Datastore'
        }.arg`,
      };
    } finally {
      await client.disconnect();
    }
  }

  public async dragArgonsAsFile(args: IArgonFileMeta, context: WebContents): Promise<void> {
    const file = Path.join(Os.tmpdir(), '.ulixee', args.name);
    await ArgonFile.create(args.file, file);
    context.startDrag({
      file,
      icon: argIconPath,
    });
  }

  public async showContextMenu(args: {
    file: IArgonFile;
    name: string;
    position: { x: number; y: number };
  }): Promise<void> {
    const file = Path.join(Os.tmpdir(), '.ulixee', args.name);
    await ArgonFile.create(args.file, file);

    const menu = Menu.buildFromTemplate([
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click() {
          try {
            // eslint-disable-next-line import/no-unresolved
            const clipboardEx = require('electron-clipboard-ex');
            clipboardEx.writeFilePaths([file]);
          } catch (e) {}
        },
      },
      {
        type: 'separator',
      },
      {
        role: 'shareMenu',
        sharingItem: {
          filePaths: [file],
        },
      },
    ]);
    menu.popup({ x: args.position.x, y: args.position.y });
  }

  public async onArgonFileOpened(file: IArgonFile): Promise<void> {
    await this.waitForConnection;
    await this.connectionToClient.sendEvent({ eventType: 'Argon.opened', data: file });
  }

  public async findAdminIdentity(datastoreId: string): Promise<string> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      message: 'Select your Admin Identity for this Datastore to enable administrative features.',
      defaultPath: Path.join(getDataDirectory(), 'ulixee', 'identities'),
      filters: [{ name: 'Identities', extensions: ['pem'] }],
    });
    if (result.filePaths.length) {
      const [filename] = result.filePaths;
      return await this.setDatastoreAdminIdentity(datastoreId, filename);
    }
    return null;
  }

  public async findCloudAdminIdentity(cloudName: string): Promise<string> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      message: 'Select your Admin Identity for this Cloud to enable administrative features.',
      defaultPath: Path.join(getDataDirectory(), 'ulixee', 'identities'),
      filters: [{ name: 'Identities', extensions: ['pem'] }],
    });
    if (result.filePaths.length) {
      const [filename] = result.filePaths;
      return await this.apiManager.localUserProfile.setCloudAdminIdentity(cloudName, filename);
    }
    return null;
  }

  public getAdminIdentities(): {
    datastoresById: {
      [id: string]: string;
    };
    cloudsByName: { [name: string]: string };
  } {
    const datastoresById: Record<string, string> = {};
    for (const { datastoreId, adminIdentity } of this.apiManager.localUserProfile
      .datastoreAdminIdentities) {
      datastoresById[datastoreId] = adminIdentity;
    }
    const cloudsByName: Record<string, string> = {};
    for (const cloud of this.apiManager.apiByCloudAddress.values()) {
      if (cloud.adminIdentity) {
        cloudsByName[cloud.name] = cloud.adminIdentity;
      }
    }
    return { datastoresById, cloudsByName };
  }

  public async onDeployment(event: IDatastoreDeployLogEntry): Promise<void> {
    await this.connectionToClient?.sendEvent({ eventType: 'Datastore.onDeployed', data: event });
  }

  public async onQuery(event: IQueryLogEntry): Promise<void> {
    await this.connectionToClient?.sendEvent({ eventType: 'User.onQuery', data: event });
  }

  public async onNewCloudAddress(event: ICloudConnected): Promise<void> {
    await this.connectionToClient?.sendEvent({ eventType: 'Cloud.onConnected', data: event });
  }

  public openReplay(arg: IOpenReplay): void {
    this.emit('open-replay', arg);
  }

  public getCloudConnections(): ICloudConnected[] {
    const result: ICloudConnected[] = [];
    for (const [address, group] of this.apiManager.apiByCloudAddress) {
      if (group.resolvable.isResolved && !group.resolvable.resolved?.api) continue;
      result.push({
        address,
        cloudNodes: group.cloudNodes,
        adminIdentity: group.adminIdentity,
        name: group.name,
        type: group.type,
      });
    }
    return result;
  }

  public async connectToPrivateCloud(arg: {
    address: string;
    name: string;
    adminIdentityPath?: string;
  }): Promise<void> {
    const { address, name, adminIdentityPath } = arg;
    if (!address) {
      console.warn('No valid address provided to connect to', arg);
      return;
    }
    const adminIdentity = adminIdentityPath
      ? Identity.loadFromFile(arg.adminIdentityPath).bech32
      : undefined;
    await this.apiManager.connectToCloud({
      address,
      type: 'private',
      name,
      adminIdentity,
    });

    const profile = this.apiManager.localUserProfile;
    if (!profile.clouds.find(x => x.address === address)) {
      profile.clouds.push({ address, name, adminIdentityPath: arg.adminIdentityPath });
      await profile.save();
    }
  }
}
