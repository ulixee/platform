import { app, BrowserWindow, ipcMain, Menu, MenuItem, shell, webContents } from 'electron';
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;

const isMac = process.platform === 'darwin';

export default function generateAppMenu(container: {
  replayControl(direction: 'back' | 'forward'): void;
  getSessionPath(): string;
}): Menu {
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
        ...createMenuItem(
          ['CmdOrCtrl+Shift+W'],
          window => {
            window?.close();
          },
          'Close Window',
        ),
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
        ...createMenuItem(
          ['CmdOrCtrl+R', 'F5'],
          window => {
            window.webContents.reload();
          },
          'Reload',
        ),
        ...createMenuItem(
          ['CmdOrCtrl+Shift+R', 'Shift+F5'],
          window => {
            window.webContents.reloadIgnoringCache();
          },
          'Reload ignoring cache',
        ),
      ],
    },
    {
      label: 'Tools',
      submenu: [
        ...createMenuItem(
          ['CmdOrCtrl+Shift+I', 'CmdOrCtrl+Shift+J', 'F12'],
          () => {
            setTimeout(() => {
              const wc = webContents.getFocusedWebContents();
              if (!wc) return;
              wc.toggleDevTools();
            }, 0);
          },
          'Developer Tools',
        ),

        // Developer tools (current webContents) (dev)
        ...createMenuItem(['CmdOrCtrl+Shift+F12'], () => {
          setTimeout(() => {
            webContents.getFocusedWebContents().openDevTools({ mode: 'detach' });
          }, 0);
        }),
      ],
    },
    {
      label: 'Replay',
      submenu: [
        {
          label: 'Open Database',
          click: () => {
            const path = container.getSessionPath();
            if (path) void shell.openPath(path);
          },
        },
        ...createMenuItem(['Left'], () => {
          container.replayControl('back');
        }),
        ...createMenuItem(['Right'], () => {
          container.replayControl('forward');
        }),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close', accelerator: '' }]),
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
