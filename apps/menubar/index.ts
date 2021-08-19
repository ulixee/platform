import { Menubar } from './lib/Menubar';

const menubar = new Menubar({
  windowPosition: 'trayLeft',
  width: 300,
  height: 300,
  tooltip: 'Ulixee',
});

menubar.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log('RUNNING MENUBAR');
});
