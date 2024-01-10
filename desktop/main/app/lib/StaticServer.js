"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StaticServer_httpServer, _StaticServer_serverPort;
Object.defineProperty(exports, "__esModule", { value: true });
const Http = require("http");
const electron_1 = require("electron");
const Fs = require("fs");
const staticServe_1 = require("@ulixee/datastore-core/lib/staticServe");
class StaticServer {
    constructor(distFolder, cacheTime) {
        _StaticServer_httpServer.set(this, void 0);
        _StaticServer_serverPort.set(this, void 0);
        cacheTime ??= electron_1.app.isPackaged ? 3600 * 24 : 0;
        if (!Fs.existsSync(distFolder))
            throw new Error(`Static UI files could not be found: ${distFolder}`);
        const fileServer = (0, staticServe_1.default)(distFolder, cacheTime);
        __classPrivateFieldSet(this, _StaticServer_httpServer, Http.createServer((req, res) => {
            void fileServer(req, res).catch(() => null);
        }), "f");
    }
    async load() {
        __classPrivateFieldSet(this, _StaticServer_serverPort, await new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _StaticServer_httpServer, "f").once('error', reject);
            __classPrivateFieldGet(this, _StaticServer_httpServer, "f").listen({ port: 0 }, () => {
                __classPrivateFieldGet(this, _StaticServer_httpServer, "f").off('error', reject);
                resolve(__classPrivateFieldGet(this, _StaticServer_httpServer, "f").address().port);
            });
        }), "f");
    }
    getPath(path) {
        return `http://localhost:${__classPrivateFieldGet(this, _StaticServer_serverPort, "f")}/${path}`;
    }
}
exports.default = StaticServer;
_StaticServer_httpServer = new WeakMap(), _StaticServer_serverPort = new WeakMap();
//# sourceMappingURL=StaticServer.js.map