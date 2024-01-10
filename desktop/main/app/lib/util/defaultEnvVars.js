"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
if (electron_1.app.isPackaged) {
    process.env.DEBUG = [process.env.DEBUG ?? '', 'ulx:*'].filter(Boolean).join(',');
    process.env.NODE_DISABLE_COLORS = 'true';
}
//# sourceMappingURL=defaultEnvVars.js.map