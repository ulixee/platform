import Address from '@ulixee/crypto/lib/Address';
import Identity from '@ulixee/crypto/lib/Identity';
import ILocalUserProfile from '../interfaces/ILocalUserProfile';
export default class LocalUserProfile {
    #private;
    static path: string;
    clouds: (ILocalUserProfile['clouds'][0] & {
        adminIdentity?: string;
    })[];
    installedDatastores: ILocalUserProfile['installedDatastores'];
    datastoreAdminIdentities: (ILocalUserProfile['datastoreAdminIdentities'][0] & {
        adminIdentity?: string;
    })[];
    gettingStartedCompletedSteps: string[];
    defaultAdminIdentityPath: string;
    get defaultAddressPath(): string;
    set defaultAddressPath(value: string);
    get defaultAddress(): Address;
    get defaultAdminIdentity(): Identity;
    constructor();
    setDatastoreAdminIdentity(datastoreId: string, adminIdentityPath: string): Promise<string>;
    setCloudAdminIdentity(cloudName: string, adminIdentityPath: string): Promise<string>;
    getAdminIdentity(datastoreId: string, cloudName: string): Identity;
    createDefaultArgonAddress(): Promise<void>;
    createDefaultAdminIdentity(): Promise<string>;
    installDatastore(cloudHost: string, datastoreId: string, datastoreVersion: string): Promise<void>;
    uninstallDatastore(cloudHost: string, datastoreId: string, datastoreVersion: string): Promise<void>;
    save(): Promise<void>;
    toJSON(): ILocalUserProfile;
    private loadProfile;
}
