"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@ulixee/commons/lib/SourceMapSupport");
const electron_1 = require("electron");
const Menubar_1 = require("./lib/Menubar");
require("./lib/util/UlixeeLogger");
require("./lib/util/defaultEnvVars");
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.DEVTOOLS_PORT ??= '8315';
electron_1.app.commandLine.appendSwitch('remote-debugging-port', process.env.DEVTOOLS_PORT);
const { version } = require('./package.json');
const menubar = new Menubar_1.Menubar({
    width: 300,
    height: 300,
    tooltip: 'Ulixee',
});
menubar.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING ULIXEE DESKTOP', version);
});
//# sourceMappingURL=index.js.map