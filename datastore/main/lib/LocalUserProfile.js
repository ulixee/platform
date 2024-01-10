"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _LocalUserProfile_defaultAdminIdentity, _LocalUserProfile_defaultAddress, _LocalUserProfile_defaultAddressPath;
Object.defineProperty(exports, "__esModule", { value: true });
const dirUtils_1 = require("@ulixee/commons/lib/dirUtils");
const fileUtils_1 = require("@ulixee/commons/lib/fileUtils");
const cli_1 = require("@ulixee/crypto/cli");
const Address_1 = require("@ulixee/crypto/lib/Address");
const Identity_1 = require("@ulixee/crypto/lib/Identity");
const Fs = require("fs");
const Path = require("path");
class LocalUserProfile {
    constructor() {
        this.clouds = [];
        this.installedDatastores = [];
        this.datastoreAdminIdentities = [];
        this.gettingStartedCompletedSteps = [];
        _LocalUserProfile_defaultAdminIdentity.set(this, void 0);
        _LocalUserProfile_defaultAddress.set(this, void 0);
        _LocalUserProfile_defaultAddressPath.set(this, void 0);
        this.loadProfile();
    }
    get defaultAddressPath() {
        return __classPrivateFieldGet(this, _LocalUserProfile_defaultAddressPath, "f");
    }
    set defaultAddressPath(value) {
        __classPrivateFieldSet(this, _LocalUserProfile_defaultAddressPath, value, "f");
        if (value)
            __classPrivateFieldSet(this, _LocalUserProfile_defaultAddress, Address_1.default.readFromPath(value), "f");
    }
    get defaultAddress() {
        return __classPrivateFieldGet(this, _LocalUserProfile_defaultAddress, "f");
    }
    get defaultAdminIdentity() {
        if (this.defaultAdminIdentityPath) {
            __classPrivateFieldSet(this, _LocalUserProfile_defaultAdminIdentity, __classPrivateFieldGet(this, _LocalUserProfile_defaultAdminIdentity, "f") ?? Identity_1.default.loadFromFile(this.defaultAdminIdentityPath), "f");
            return __classPrivateFieldGet(this, _LocalUserProfile_defaultAdminIdentity, "f");
        }
    }
    async setDatastoreAdminIdentity(datastoreId, adminIdentityPath) {
        let existing = this.datastoreAdminIdentities.find(x => x.datastoreId === datastoreId);
        if (!existing) {
            existing = { datastoreId, adminIdentityPath };
            this.datastoreAdminIdentities.push(existing);
        }
        existing.adminIdentityPath = adminIdentityPath;
        existing.adminIdentity = Identity_1.default.loadFromFile(adminIdentityPath)?.bech32;
        await this.save();
        return existing.adminIdentity;
    }
    async setCloudAdminIdentity(cloudName, adminIdentityPath) {
        if (cloudName === 'local') {
            this.defaultAdminIdentityPath = adminIdentityPath;
            __classPrivateFieldSet(this, _LocalUserProfile_defaultAdminIdentity, null, "f");
            return this.defaultAdminIdentity.bech32;
        }
        const existing = this.clouds.find(x => x.name === cloudName);
        existing.adminIdentityPath = adminIdentityPath;
        existing.adminIdentity = Identity_1.default.loadFromFile(adminIdentityPath)?.bech32;
        await this.save();
        return existing.adminIdentity;
    }
    getAdminIdentity(datastoreId, cloudName) {
        const datastoreAdmin = this.datastoreAdminIdentities.find(x => x.datastoreId === datastoreId);
        if (datastoreAdmin?.adminIdentityPath)
            return Identity_1.default.loadFromFile(datastoreAdmin.adminIdentityPath);
        if (cloudName === 'local')
            return this.defaultAdminIdentity;
        const cloud = this.clouds.find(x => x.name === cloudName);
        if (cloud?.adminIdentityPath)
            return Identity_1.default.loadFromFile(cloud.adminIdentityPath);
    }
    async createDefaultArgonAddress() {
        const addressPath = Path.join((0, dirUtils_1.getDataDirectory)(), 'ulixee', 'addresses', 'UlixeeAddress.json');
        // eslint-disable-next-line no-console
        console.log('Creating a Default Ulixee Argon Address. `@ulixee/crypto address UU "%s"`', addressPath);
        await (0, cli_1.default)().parseAsync(['address', '-q', 'UU', addressPath], { from: 'user' });
        this.defaultAddressPath = addressPath;
        await this.save();
    }
    async createDefaultAdminIdentity() {
        const identity = await Identity_1.default.create();
        this.defaultAdminIdentityPath = Path.join((0, dirUtils_1.getDataDirectory)(), 'ulixee', 'identities', 'adminIdentity.pem');
        await identity.save(this.defaultAdminIdentityPath);
        await this.save();
        return identity.bech32;
    }
    async installDatastore(cloudHost, datastoreId, datastoreVersion) {
        if (!this.installedDatastores.some(x => x.cloudHost === cloudHost &&
            x.datastoreId === datastoreId &&
            x.datastoreVersion === datastoreVersion)) {
            this.installedDatastores.push({ datastoreId, cloudHost, datastoreVersion });
            await this.save();
        }
    }
    async uninstallDatastore(cloudHost, datastoreId, datastoreVersion) {
        const index = this.installedDatastores.findIndex(x => x.cloudHost === cloudHost &&
            x.datastoreId === datastoreId &&
            x.datastoreVersion === datastoreVersion);
        if (index >= 0) {
            this.installedDatastores.splice(index, 1);
            await this.save();
        }
    }
    async save() {
        await (0, fileUtils_1.safeOverwriteFile)(LocalUserProfile.path, JSON.stringify(this.toJSON()));
    }
    toJSON() {
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
    loadProfile() {
        if (!Fs.existsSync(LocalUserProfile.path))
            return;
        try {
            const data = JSON.parse(Fs.readFileSync(LocalUserProfile.path, 'utf8'));
            Object.assign(this, data);
            this.clouds ??= [];
            for (const cloud of this.clouds) {
                if (cloud.adminIdentityPath) {
                    cloud.adminIdentity = Identity_1.default.loadFromFile(cloud.adminIdentityPath).bech32;
                }
            }
            this.datastoreAdminIdentities ??= [];
            this.gettingStartedCompletedSteps ??= [];
            this.installedDatastores ??= [];
            this.defaultAddressPath = data.defaultAddressPath;
        }
        catch { }
    }
}
exports.default = LocalUserProfile;
_LocalUserProfile_defaultAdminIdentity = new WeakMap(), _LocalUserProfile_defaultAddress = new WeakMap(), _LocalUserProfile_defaultAddressPath = new WeakMap();
LocalUserProfile.path = Path.join((0, dirUtils_1.getDataDirectory)(), 'ulixee', 'user-profile.json');
//# sourceMappingURL=LocalUserProfile.js.map