"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const isMac = process.platform === 'darwin';
function generateAppMenu(loadedChromeAlive) {
    const template = [
        ...(isMac
            ? [
                {
                    label: electron_1.app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideothers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' },
                    ],
                },
            ]
            : []),
        {
            label: 'File',
            submenu: [
                {
                    type: 'separator',
                },
                ...createMenuItem(['CmdOrCtrl+Shift+O'], () => {
                    electron_1.ipcMain.emit('open-file');
                }, 'Open Hero Session'),
                {
                    type: 'separator',
                },
                isMac ? { role: 'close' } : { role: 'quit' },
                {
                    type: 'separator',
                },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac
                    ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete' },
                        { role: 'selectAll' },
                        { type: 'separator' },
                        {
                            label: 'Speech',
                            submenu: [{ role: 'startspeaking' }, { role: 'stopspeaking' }],
                        },
                    ]
                    : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
            ],
        },
        {
            label: 'View',
            submenu: [
                !loadedChromeAlive ? { role: 'reload' } : undefined,
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ].filter(Boolean),
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac
                    ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
                    : [{ role: 'close' }]),
                { type: 'separator' },
                {
                    label: 'Always on top',
                    type: 'checkbox',
                    checked: false,
                    click(menuItem, browserWindow) {
                        browserWindow.setAlwaysOnTop(!browserWindow.isAlwaysOnTop());
                        menuItem.checked = browserWindow.isAlwaysOnTop();
                    },
                },
            ],
        },
    ];
    if (loadedChromeAlive) {
        template.splice(template.length - 1, 0, {
            label: 'Replay',
            submenu: [
                {
                    label: 'Open Database',
                    click: () => {
                        void electron_1.shell.openPath(loadedChromeAlive.session.dbPath);
                    },
                },
                ...createMenuItem(['Left'], () => {
                    loadedChromeAlive.replayControl('back');
                }),
                ...createMenuItem(['Right'], () => {
                    loadedChromeAlive.replayControl('forward');
                }),
            ],
        });
    }
    return electron_1.Menu.buildFromTemplate(template);
}
exports.default = generateAppMenu;
// HELPER FUNCTIONS //////
function createMenuItem(shortcuts, action, label = null, enabled = true) {
    return shortcuts.map((shortcut, key) => ({
        accelerator: shortcut,
        visible: label != null && key === 0,
        label: label != null && key === 0 ? label : '',
        enabled,
        click: (menuItem, browserWindow) => action(browserWindow, menuItem, key),
    }));
}
//# sourceMappingURL=generateAppMenu.js.map