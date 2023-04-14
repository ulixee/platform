import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import CreditsStore from '@ulixee/datastore/lib/CreditsStore';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import ArgonUtils from '@ulixee/sidechain/lib/ArgonUtils';
import { ICloudConnected, IUserBalance } from '@ulixee/desktop-interfaces/apis/IDesktopApis';
import { dialog, Menu, WebContents } from 'electron';
import * as Path from 'path';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import * as Os from 'os';
import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import { IDesktopProfile } from './DesktopProfile';
import ArgonFile from './ArgonFile';
import ApiManager from './ApiManager';

type IDatastoreResultItem = IDatastoreApiTypes['Datastores.list']['result']['datastores'][0];

const argIconPath = Path.resolve(__dirname, '..', 'assets', 'arg.png');

export default class DesktopPrivateApiHandler extends TypedEventEmitter<{
  'open-chromealive': { cloudAddress: string; heroSessionId: string; dbPath: string };
}> {
  public Apis: { [apiName: string]: Function };
  private events = new EventSubscriber();

  constructor(
    private readonly apiManager: ApiManager,
    private sendDesktopEvent: (eventType: string, args: any) => Promise<any>,
  ) {
    super();
    bindFunctions(this);
    this.events.on(apiManager, 'new-cloud-address', this.onNewCloudAddress.bind(this));
    this.events.on(apiManager, 'deployment', this.onDeployment.bind(this));
    this.events.on(apiManager, 'query', this.onQuery.bind(this));
    this.Apis = {
      'Argon.dropFile': this.onArgonFileDrop,
      'Credit.create': this.createCredit,
      'Credit.save': this.saveCredit,
      'Credit.dragAsFile': this.dragCreditAsFile,
      'Credit.showContextMenu': this.showContextMenu,
      'Cloud.findAdminIdentity': this.findCloudAdminIdentity,
      'Datastore.setAdminIdentity': this.setDatastoreAdminIdentity,
      'Datastore.findAdminIdentity': this.findAdminIdentity,
      'Datastore.getInstalled': this.getInstalledDatastores,
      'Datastore.deploy': this.deployDatastore,
      'Datastore.install': this.installDatastore,
      'Desktop.getAdminIdentities': this.getAdminIdentities,
      'Desktop.getCloudConnections': this.getCloudConnections,
      'Desktop.connectToPrivateCloud': this.connectToPrivateCloud,
      'GettingStarted.getCompletedSteps': this.gettingStartedProgress,
      'GettingStarted.completeStep': this.completeGettingStartedStep,
      'Session.openReplay': this.openReplay,
      'User.getQueries': this.getQueries,
      'User.getBalance': this.getUserBalance,
    };
  }

  public async getUserBalance(): Promise<IUserBalance> {
    const credits = await CreditsStore.asList();
    const centagonsBalance = 0 * Number(ArgonUtils.CentagonsPerArgon);
    const microgons = ArgonUtils.centagonsToMicrogons(centagonsBalance);
    const creditsBalance = credits.reduce((total, x) => x.remainingBalance + total, 0);

    const walletBalance = ArgonUtils.format(creditsBalance + microgons, 'microgons', 'argons');
    return {
      credits,
      centagonsBalance,
      address: this.apiManager.desktopProfile.address.bech32,
      walletBalance,
    };
  }

  public async completeGettingStartedStep(step: string): Promise<void> {
    if (!this.apiManager.desktopProfile.gettingStartedCompletedSteps.includes(step)) {
      this.apiManager.desktopProfile.gettingStartedCompletedSteps.push(step);
      await this.apiManager.desktopProfile.save();
    }
  }

  public gettingStartedProgress(): string[] {
    return this.apiManager.desktopProfile.gettingStartedCompletedSteps ?? [];
  }

  public async onArgonFileDrop(path: string): Promise<void> {
    const argonFile = await ArgonFile.readFromPath(path);
    await this.onArgonFileOpened(argonFile);
  }

  public getInstalledDatastores(): IDesktopProfile['installedDatastores'] {
    return this.apiManager.desktopProfile.installedDatastores;
  }

  public getQueries(): IQueryLogEntry[] {
    return Object.values(this.apiManager.queryLogWatcher.queriesById);
  }

  public async deployDatastore(args: {
    versionHash: string;
    cloudHost: string;
    cloudName: string;
  }): Promise<void> {
    const { versionHash, cloudName, cloudHost } = args;
    const adminIdentity = this.apiManager.desktopProfile.getAdminIdentity(versionHash, cloudName);

    if (!cloudHost) throw new Error('No cloud host available.');
    // TODO: download from api client. If it's a local file, do we build for them?
    const dbx = Buffer.from([]);
    const apiClient = new DatastoreApiClient(cloudHost);
    await apiClient.upload(dbx, { identity: adminIdentity });
  }

  public async installDatastore(arg: {
    cloudHost: string;
    datastoreVersionHash: string;
  }): Promise<void> {
    const { cloudHost, datastoreVersionHash } = arg;
    await this.apiManager.desktopProfile.installDatastore(cloudHost, datastoreVersionHash);
  }

  public async setDatastoreAdminIdentity(
    datastoreVersionHash: string,
    adminIdentityPath: string,
  ): Promise<string> {
    return await this.apiManager.desktopProfile.setDatastoreAdminIdentity(
      datastoreVersionHash,
      adminIdentityPath,
    );
  }

  public async saveCredit(arg: { credit: IArgonFile['credit'] }): Promise<void> {
    await CreditsStore.storeFromUrl(arg.credit.datastoreUrl, arg.credit.microgons);
  }

  public async createCredit(args: {
    datastore: Pick<IDatastoreResultItem, 'versionHash' | 'name' | 'domain' | 'scriptEntrypoint'>;
    cloud: string;
    argons: number;
  }): Promise<{ credit: IArgonFile['credit']; filename: string }> {
    const { argons, datastore } = args;
    const address = new URL(this.apiManager.getCloudAddressByName(args.cloud));
    const adminIdentity = this.apiManager.desktopProfile.getAdminIdentity(
      datastore.versionHash,
      args.cloud,
    );
    if (!adminIdentity) {
      throw new Error("Sorry, we couldn't find the AdminIdentity for this cloud.");
    }
    const microgons = ArgonUtils.centagonsToMicrogons(
      argons * Number(ArgonUtils.CentagonsPerArgon),
    );
    const client = new DatastoreApiClient(address.href);
    try {
      const { id, remainingCredits, secret } = await client.createCredits(
        datastore.versionHash,
        microgons,
        adminIdentity,
      );

      return {
        credit: {
          datastoreUrl: `ulx://${id}:${secret}@${address.host}/${datastore.versionHash}`,
          microgons: remainingCredits,
        },
        filename: `₳${argons} at ${
          (datastore.name ?? datastore.scriptEntrypoint)?.replace(/[.\\/]/g, '-') ??
          'a Ulixee Datastore'
        }.arg`,
      };
    } finally {
      await client.disconnect();
    }
  }

  public async dragCreditAsFile(
    args: { credit: IArgonFile['credit']; filename: string },
    context: WebContents,
  ): Promise<void> {
    const file = Path.join(Os.tmpdir(), '.ulixee', args.filename);
    await ArgonFile.createCredit(args.credit, file);
    await context.startDrag({
      file,
      icon: argIconPath,
    });
  }

  public async showContextMenu(args: {
    credit: IArgonFile['credit'];
    filename: string;
    position: { x: number; y: number };
  }): Promise<void> {
    const file = Path.join(Os.tmpdir(), '.ulixee', args.filename);
    await ArgonFile.createCredit(args.credit, file);

    const menu = Menu.buildFromTemplate([
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click() {
          try {
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
    await this.sendDesktopEvent('Argon.opened', file);
  }

  public async findAdminIdentity(datastoreVersionHash: string): Promise<string> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      message: 'Select your Admin Identity for this Datastore to enable administrative features.',
      defaultPath: Path.join(getCacheDirectory(), 'ulixee', 'identities'),
      filters: [{ name: 'Identities', extensions: ['pem'] }],
    });
    if (result.filePaths.length) {
      const [filename] = result.filePaths;
      return await this.setDatastoreAdminIdentity(datastoreVersionHash, filename);
    }
    return null;
  }

  public async findCloudAdminIdentity(cloudName: string): Promise<string> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'showHiddenFiles'],
      message: 'Select your Admin Identity for this Cloud to enable administrative features.',
      defaultPath: Path.join(getCacheDirectory(), 'ulixee', 'identities'),
      filters: [{ name: 'Identities', extensions: ['pem'] }],
    });
    if (result.filePaths.length) {
      const [filename] = result.filePaths;
      return await this.apiManager.desktopProfile.setCloudAdminIdentity(cloudName, filename);
    }
    return null;
  }

  public getAdminIdentities(): {
    datastoresByVersion: {
      [versionHash: string]: string;
    };
    cloudsByName: { [name: string]: string };
  } {
    const datastoresByVersion: Record<string, string> = {};
    for (const { datastoreVersionHash, adminIdentity } of this.apiManager.desktopProfile
      .datastoreAdminIdentities) {
      datastoresByVersion[datastoreVersionHash] = adminIdentity;
    }
    const cloudsByName: Record<string, string> = {};
    for (const cloud of this.apiManager.apiByCloudAddress.values()) {
      if (cloud.adminIdentity) {
        cloudsByName[cloud.name] = cloud.adminIdentity;
      }
    }
    return { datastoresByVersion, cloudsByName };
  }

  public async onDeployment(event: IDatastoreDeployLogEntry): Promise<void> {
    await this.sendDesktopEvent('Datastore.onDeployed', event);
  }

  public async onQuery(event: IQueryLogEntry): Promise<void> {
    await this.sendDesktopEvent('User.onQuery', event);
  }

  public async onNewCloudAddress(event: ICloudConnected): Promise<void> {
    await this.sendDesktopEvent('Cloud.onConnected', event);
  }

  public openReplay(arg: this['EventTypes']['open-chromealive']): void {
    this.emit('open-chromealive', arg);
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
    const profile = this.apiManager.desktopProfile;
    if (!profile.clouds.find(x => x.address === address)) {
      profile.clouds.push({ address, name, adminIdentityPath: arg.adminIdentityPath });
      await profile.save();
    }
  }

  public async handleApi(api: string, args: any, context: WebContents): Promise<any> {
    return await this.Apis[api](args, context);
  }
}
