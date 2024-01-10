"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
function generateContextMenu(params, webContents) {
    let menuItems = [];
    if (params.linkURL !== '') {
        menuItems = menuItems.concat([
            {
                label: 'Copy link address',
                click: () => {
                    electron_1.clipboard.clear();
                    electron_1.clipboard.writeText(params.linkURL);
                },
            },
            {
                type: 'separator',
            },
        ]);
    }
    if (params.hasImageContents) {
        menuItems = menuItems.concat([
            {
                label: 'Copy image',
                click: () => {
                    const img = electron_1.nativeImage.createFromDataURL(params.srcURL);
                    electron_1.clipboard.clear();
                    electron_1.clipboard.writeImage(img);
                },
            },
            {
                label: 'Copy image address',
                click: () => {
                    electron_1.clipboard.clear();
                    electron_1.clipboard.writeText(params.srcURL);
                },
            },
            {
                type: 'separator',
            },
        ]);
    }
    if (params.isEditable) {
        menuItems = menuItems.concat([
            {
                role: 'undo',
                accelerator: 'CmdOrCtrl+Z',
            },
            {
                role: 'redo',
                accelerator: 'CmdOrCtrl+Shift+Z',
            },
            {
                type: 'separator',
            },
            {
                role: 'cut',
                accelerator: 'CmdOrCtrl+X',
            },
            {
                role: 'copy',
                accelerator: 'CmdOrCtrl+C',
            },
            {
                role: 'pasteAndMatchStyle',
                accelerator: 'CmdOrCtrl+V',
                label: 'Paste',
            },
            {
                role: 'paste',
                accelerator: 'CmdOrCtrl+Shift+V',
                label: 'Paste as plain text',
            },
            {
                role: 'selectAll',
                accelerator: 'CmdOrCtrl+A',
            },
            {
                type: 'separator',
            },
        ]);
    }
    if (!params.isEditable && params.selectionText !== '') {
        menuItems = menuItems.concat([
            {
                role: 'copy',
                accelerator: 'CmdOrCtrl+C',
            },
            {
                type: 'separator',
            },
        ]);
    }
    menuItems.push({
        label: 'Inspect',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: () => {
            webContents.inspectElement(params.x, params.y);
            if (!webContents.isDevToolsFocused())
                webContents.devToolsWebContents?.focus();
        },
    });
    return electron_1.Menu.buildFromTemplate(menuItems);
}
exports.default = generateContextMenu;
//# sourceMappingURL=generateContextMenu.js.map