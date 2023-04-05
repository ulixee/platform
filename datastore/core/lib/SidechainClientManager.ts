import SidechainClient from '@ulixee/sidechain';
import { InvalidIdentityError } from '@ulixee/crypto/lib/errors';
import { UnapprovedSidechainError } from '@ulixee/sidechain/lib/errors';
import { IBlockSettings } from '@ulixee/specification';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import IDatastoreCoreConfigureOptions from '../interfaces/IDatastoreCoreConfigureOptions';

export default class SidechainClientManager {
  public get defaultClient(): SidechainClient {
    if (!this.options.defaultSidechainHost) {
      return null;
    }
    this._defaultClient ??= this.createSidechainClient(this.options.defaultSidechainHost);
    return this._defaultClient;
  }

  private _defaultClient: SidechainClient;
  private _approvedSidechainsResolvable: Resolvable<IApprovedSidechainByRootIdentity>;
  private sidechainClientsByIdentity: { [identity: string]: SidechainClient } = {};

  private refreshApprovedSidechainsInterval: NodeJS.Timeout;

  constructor(
    private readonly options: Partial<
      Pick<
        IDatastoreCoreConfigureOptions,
        | 'identityWithSidechain'
        | 'approvedSidechains'
        | 'approvedSidechainsRefreshInterval'
        | 'defaultSidechainHost'
        | 'defaultSidechainRootIdentity'
      >
    >,
  ) {
    this.options ??= {};
    this.withIdentity = this.withIdentity.bind(this);
  }

  public async withIdentity(rootIdentity: string): Promise<SidechainClient> {
    const client = this.sidechainClientsByIdentity[rootIdentity];
    if (client) return client;

    const approvedSidechains = await this.getApprovedSidechainsByIdentity();

    const sidechain = approvedSidechains[rootIdentity];
    if (!sidechain)
      throw new UnapprovedSidechainError(
        `The requested Sidechain (${rootIdentity}) is not approved by your configured default approved Sidechains list.`,
      );

    return (this.sidechainClientsByIdentity[rootIdentity] ??= this.createSidechainClient(
      sidechain.url,
    ));
  }

  public async getApprovedSidechainRootIdentities(): Promise<Set<string>> {
    return new Set(Object.keys(await this.getApprovedSidechainsByIdentity()));
  }

  public async getApprovedSidechainsByIdentity(): Promise<IApprovedSidechainByRootIdentity> {
    if (this._approvedSidechainsResolvable) return this._approvedSidechainsResolvable.promise;

    this._approvedSidechainsResolvable = new Resolvable();
    if (this.options.approvedSidechains?.length) {
      const approved = SidechainClientManager.parseApprovedSidechains(
        this.options.approvedSidechains,
      );
      this._approvedSidechainsResolvable.resolve(approved);
      return this._approvedSidechainsResolvable;
    }

    try {
      const settings = await this.defaultClient.getSettings(true);
      if (
        this.options.defaultSidechainRootIdentity &&
        !settings.rootIdentities.includes(this.options.defaultSidechainRootIdentity)
      ) {
        throw new InvalidIdentityError(
          `The root identity of the Sidechain you've connected to does not match your configuration. Please verify and restart this machine!`,
        );
      }

      for (const identity of settings.rootIdentities) {
        this.sidechainClientsByIdentity[identity] = this.defaultClient;
      }
      const approved = SidechainClientManager.parseApprovedSidechains(
        settings.latestBlockSettings.sidechains,
      );
      this._approvedSidechainsResolvable.resolve(approved);
    } catch (error) {
      this._approvedSidechainsResolvable.reject(error);
    }

    if (this.options.approvedSidechainsRefreshInterval) {
      this.refreshApprovedSidechainsInterval = setTimeout(
        () => (this._approvedSidechainsResolvable = null),
        this.options.approvedSidechainsRefreshInterval,
      ).unref();
    }

    return this._approvedSidechainsResolvable;
  }

  private createSidechainClient(host: string): SidechainClient {
    if (!this.options.identityWithSidechain)
      throw new Error(
        "This DatastoreCore wasn't supplied with an Identity. Without an Identity, it cannot interact with the Ulixee Sidechain for payments.",
      );
    return new SidechainClient(
      host,
      {
        identity: this.options.identityWithSidechain,
      },
      true,
    );
  }

  private static parseApprovedSidechains(
    sidechains: IBlockSettings['sidechains'],
  ): IApprovedSidechainByRootIdentity {
    const approved: IApprovedSidechainByRootIdentity = {};
    for (const sidechain of sidechains) {
      approved[sidechain.rootIdentity] = sidechain;
    }
    return approved;
  }
}

interface IApprovedSidechainByRootIdentity {
  [rootIdentity: string]: { url: string };
}
