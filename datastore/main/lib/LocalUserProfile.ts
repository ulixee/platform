import { getDataDirectory } from '@ulixee/commons/lib/dirUtils';
import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import CryptoCli from '@ulixee/crypto/cli';
import Address from '@ulixee/crypto/lib/Address';
import Identity from '@ulixee/crypto/lib/Identity';
import * as Fs from 'fs';
import * as Path from 'path';
import ILocalUserProfile from '../interfaces/ILocalUserProfile';

export default class LocalUserProfile {
  public static path = Path.join(getDataDirectory(), 'ulixee', 'user-profile.json');
  public clouds: (ILocalUserProfile['clouds'][0] & { adminIdentity?: string })[] = [];
  public installedDatastores: ILocalUserProfile['installedDatastores'] = [];
  public datastoreAdminIdentities: (ILocalUserProfile['datastoreAdminIdentities'][0] & {
    adminIdentity?: string;
  })[] = [];

  public gettingStartedCompletedSteps: string[] = [];
  public defaultAdminIdentityPath: string;

  public get defaultAddressPath(): string {
    return this.#defaultAddressPath;
  }

  public set defaultAddressPath(value: string) {
    this.#defaultAddressPath = value;
    if (value) this.#defaultAddress = Address.readFromPath(value);
  }

  public get defaultAddress(): Address {
    return this.#defaultAddress;
  }

  public get defaultAdminIdentity(): Identity {
    if (this.defaultAdminIdentityPath) {
      this.#defaultAdminIdentity ??= Identity.loadFromFile(this.defaultAdminIdentityPath);
      return this.#defaultAdminIdentity;
    }
  }

  #defaultAdminIdentity: Identity;
  #defaultAddress: Address;
  #defaultAddressPath: string;

  constructor() {
    this.loadProfile();
  }

  public async setDatastoreAdminIdentity(
    datastoreId: string,
    adminIdentityPath: string,
  ): Promise<string> {
    let existing = this.datastoreAdminIdentities.find(x => x.datastoreId === datastoreId);
    if (!existing) {
      existing = { datastoreId, adminIdentityPath };
      this.datastoreAdminIdentities.push(existing);
    }
    existing.adminIdentityPath = adminIdentityPath;
    existing.adminIdentity = Identity.loadFromFile(adminIdentityPath)?.bech32;
    await this.save();
    return existing.adminIdentity;
  }

  public async setCloudAdminIdentity(
    cloudName: string,
    adminIdentityPath: string,
  ): Promise<string> {
    if (cloudName === 'local') {
      this.defaultAdminIdentityPath = adminIdentityPath;
      this.#defaultAdminIdentity = null;
      return this.defaultAdminIdentity.bech32;
    }
    const existing = this.clouds.find(x => x.name === cloudName);
    existing.adminIdentityPath = adminIdentityPath;
    existing.adminIdentity = Identity.loadFromFile(adminIdentityPath)?.bech32;
    await this.save();
    return existing.adminIdentity;
  }

  public getAdminIdentity(datastoreId: string, cloudName: string): Identity {
    const datastoreAdmin = this.datastoreAdminIdentities.find(x => x.datastoreId === datastoreId);
    if (datastoreAdmin?.adminIdentityPath)
      return Identity.loadFromFile(datastoreAdmin.adminIdentityPath);

    if (cloudName === 'local') return this.defaultAdminIdentity;

    const cloud = this.clouds.find(x => x.name === cloudName);
    if (cloud?.adminIdentityPath) return Identity.loadFromFile(cloud.adminIdentityPath);
  }

  public async createDefaultArgonAddress(): Promise<void> {
    const addressPath = Path.join(getDataDirectory(), 'ulixee', 'addresses', 'UlixeeAddress.json');
    // eslint-disable-next-line no-console
    console.log(
      'Creating a Default Ulixee Argon Address. `@ulixee/crypto address UU "%s"`',
      addressPath,
    );
    await CryptoCli().parseAsync(['address', '-q', 'UU', addressPath], { from: 'user' });
    this.defaultAddressPath = addressPath;
    await this.save();
  }

  public async createDefaultAdminIdentity(): Promise<string> {
    const identity = await Identity.create();
    this.defaultAdminIdentityPath = Path.join(
      getDataDirectory(),
      'ulixee',
      'identities',
      'adminIdentity.pem',
    );

    await identity.save(this.defaultAdminIdentityPath);
    await this.save();
    return identity.bech32;
  }

  public async installDatastore(
    cloudHost: string,
    datastoreId: string,
    datastoreVersion: string,
  ): Promise<void> {
    if (
      !this.installedDatastores.some(
        x =>
          x.cloudHost === cloudHost &&
          x.datastoreId === datastoreId &&
          x.datastoreVersion === datastoreVersion,
      )
    ) {
      this.installedDatastores.push({ datastoreId, cloudHost, datastoreVersion });
      await this.save();
    }
  }

  public async uninstallDatastore(
    cloudHost: string,
    datastoreId: string,
    datastoreVersion: string,
  ): Promise<void> {
    const index = this.installedDatastores.findIndex(
      x =>
        x.cloudHost === cloudHost &&
        x.datastoreId === datastoreId &&
        x.datastoreVersion === datastoreVersion,
    );
    if (index >= 0) {
      this.installedDatastores.splice(index, 1);
      await this.save();
    }
  }

  public async save(): Promise<void> {
    await safeOverwriteFile(LocalUserProfile.path, JSON.stringify(this.toJSON()));
  }

  public toJSON(): ILocalUserProfile {
    return {
      clouds: this.clouds,
      installedDatastores: this.installedDatastores,
      defaultAddressPath: this.defaultAddressPath,
      defaultAdminIdentityPath: this.defaultAdminIdentityPath,
      gettingStartedCompletedSteps: this.gettingStartedCompletedSteps,
      datastoreAdminIdentities: this.datastoreAdminIdentities.map(x => ({
        adminIdentityPath: x.adminIdentityPath,
        datastoreId: x.datastoreId,
      })),
    };
  }

  private loadProfile(): void {
    if (!Fs.existsSync(LocalUserProfile.path)) return;
    try {
      const data: ILocalUserProfile = JSON.parse(Fs.readFileSync(LocalUserProfile.path, 'utf8'));
      Object.assign(this, data);
      this.clouds ??= [];
      for (const cloud of this.clouds) {
        if (cloud.adminIdentityPath) {
          cloud.adminIdentity = Identity.loadFromFile(cloud.adminIdentityPath).bech32;
        }
      }
      this.datastoreAdminIdentities ??= [];
      this.gettingStartedCompletedSteps ??= [];
      this.installedDatastores ??= [];
      this.defaultAddressPath = data.defaultAddressPath;
    } catch {}
  }
}
