import * as Fs from 'fs';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import Address from '@ulixee/crypto/lib/Address';
import * as Path from 'path';
import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import CryptoCli from '@ulixee/crypto/cli';
import Identity from '@ulixee/crypto/lib/Identity';

export default class DesktopProfile {
  public static path = Path.join(getCacheDirectory(), 'ulixee', 'desktop-profile.json');
  public clouds: (IDesktopProfile['clouds'][0] & { adminIdentity?: string })[] = [];
  public installedDatastores: IDesktopProfile['installedDatastores'] = [];
  public datastoreAdminIdentities: (IDesktopProfile['datastoreAdminIdentities'][0] & {
    adminIdentity?: string;
  })[] = [];

  public gettingStartedCompletedSteps: string[] = [];
  public adminIdentityPath: string;

  public get addressPath(): string {
    return this.#addressPath;
  }

  public set addressPath(value: string) {
    this.#addressPath = value;
    if (value) this.#address = Address.readFromPath(value);
  }

  public get address(): Address {
    return this.#address;
  }

  public get adminIdentity(): Identity {
    if (this.adminIdentityPath) {
      this.#adminIdentity ??= Identity.loadFromFile(this.adminIdentityPath);
      return this.#adminIdentity;
    }
  }

  #address: Address;
  #adminIdentity: Identity;
  #addressPath: string;

  constructor() {
    this.loadProfile();
  }

  public async setDatastoreAdminIdentity(
    datastoreVersionHash: string,
    adminIdentityPath: string,
  ): Promise<string> {
    let existing = this.datastoreAdminIdentities.find(
      x => x.datastoreVersionHash === datastoreVersionHash,
    );
    if (!existing) {
      existing = { adminIdentityPath, datastoreVersionHash };
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
      this.adminIdentityPath = adminIdentityPath;
      this.#adminIdentity = null;
      return this.adminIdentity.bech32;
    }
    const existing = this.clouds.find(x => x.name === cloudName);
    existing.adminIdentityPath = adminIdentityPath;
    existing.adminIdentity = Identity.loadFromFile(adminIdentityPath)?.bech32;
    await this.save();
    return existing.adminIdentity;
  }

  public getAdminIdentity(datastoreVersionHash: string, cloudName: string): Identity {
    const datastoreAdmin = this.datastoreAdminIdentities.find(
      x => x.datastoreVersionHash === datastoreVersionHash,
    );
    if (datastoreAdmin?.adminIdentityPath)
      return Identity.loadFromFile(datastoreAdmin.adminIdentityPath);

    if (cloudName === 'local') return this.adminIdentity;

    const cloud = this.clouds.find(x => x.name === cloudName);
    if (cloud?.adminIdentityPath) return Identity.loadFromFile(cloud.adminIdentityPath);
  }

  public async createDefaultArgonAddress(): Promise<void> {
    const addressPath = Path.join(getCacheDirectory(), 'ulixee', 'addresses', 'UlixeeAddress.json');
    // eslint-disable-next-line no-console
    console.log(
      'Creating a Default Ulixee Argon Address. `@ulixee/crypto address UU "%s"`',
      addressPath,
    );
    await CryptoCli().parseAsync(['address', 'UU', addressPath, '-q'], { from: 'user' });
    this.addressPath = addressPath;
    await this.save();
  }

  public async createDefaultAdminIdentity(): Promise<string> {
    const identity = await Identity.create();
    this.adminIdentityPath = Path.join(
      getCacheDirectory(),
      'ulixee',
      'identities',
      'adminIdentity.pem',
    );

    await identity.save(this.adminIdentityPath);
    return identity.bech32;
  }

  public async installDatastore(cloudHost: string, datastoreVersionHash: string): Promise<void> {
    if (
      !this.installedDatastores.some(
        x => x.cloudHost === cloudHost && x.datastoreVersionHash === datastoreVersionHash,
      )
    ) {
      this.installedDatastores.push({ cloudHost, datastoreVersionHash });
      await this.save();
    }
  }

  public async save(): Promise<void> {
    await safeOverwriteFile(DesktopProfile.path, JSON.stringify(this.toJSON()));
  }

  public toJSON(): IDesktopProfile {
    return {
      clouds: this.clouds,
      installedDatastores: this.installedDatastores,
      addressPath: this.addressPath,
      adminIdentityPath: this.adminIdentityPath,
      gettingStartedCompletedSteps: this.gettingStartedCompletedSteps,
      datastoreAdminIdentities: this.datastoreAdminIdentities.map(x => ({
        adminIdentityPath: x.adminIdentityPath,
        datastoreVersionHash: x.datastoreVersionHash,
      })),
    };
  }

  private loadProfile(): void {
    if (!Fs.existsSync(DesktopProfile.path)) return;
    try {
      const data: IDesktopProfile = JSON.parse(Fs.readFileSync(DesktopProfile.path, 'utf8'));
      this.clouds = data.clouds ?? [];
      for (const cloud of this.clouds) {
        if (cloud.adminIdentityPath) {
          cloud.adminIdentity = Identity.loadFromFile(cloud.adminIdentityPath).bech32;
        }
      }
      this.gettingStartedCompletedSteps = data.gettingStartedCompletedSteps ?? [];
      this.installedDatastores = data.installedDatastores ?? [];
      this.addressPath = data.addressPath;
    } catch {}
  }
}

export interface IDesktopProfile {
  clouds: { address: string; adminIdentityPath?: string; name: string }[];
  installedDatastores: { cloudHost: string; datastoreVersionHash: string }[];
  gettingStartedCompletedSteps: string[];
  datastoreAdminIdentities: { datastoreVersionHash: string; adminIdentityPath?: string }[];
  addressPath: string;
  adminIdentityPath: string;
}
