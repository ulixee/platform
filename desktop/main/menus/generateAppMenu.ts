import { app, BrowserWindow, ipcMain, Menu, MenuItem, shell } from 'electron';
import ChromeAliveWindow from '../lib/ChromeAliveWindow';
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;

const isMac = process.platform === 'darwin';

export default function generateAppMenu(loadedChromeAlive: ChromeAliveWindow): Menu {
  const template: any = [
    ...(isMac
      ? [
          {
            label: app.name,
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
        ...createMenuItem(
          ['CmdOrCtrl+Shift+O'],
          () => {
            ipcMain.emit('open-file');
          },
          'Open Hero Session',
        ),
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
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
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
          click(menuItem: MenuItem, browserWindow: BrowserWindow) {
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
            void shell.openPath(loadedChromeAlive.session.dbPath);
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

  return Menu.buildFromTemplate(template);
}

// HELPER FUNCTIONS //////

function createMenuItem(
  shortcuts: string[],
  action: (window: BrowserWindow, menuItem: MenuItem, shortcutIndex: number) => void,
  label: string = null,
  enabled = true,
): MenuItemConstructorOptions[] {
  return shortcuts.map((shortcut, key) => ({
    accelerator: shortcut,
    visible: label != null && key === 0,
    label: label != null && key === 0 ? label : '',
    enabled,
    click: (menuItem: MenuItem, browserWindow: BrowserWindow) =>
      action(browserWindow, menuItem, key),
  }));
}
