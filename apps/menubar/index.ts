import * as Path from 'path';
import { Menubar } from './lib/Menubar';

const iconPath = Path.resolve(__dirname, 'assets', 'IconTemplate.png');
const vueDistPath = Path.resolve(__dirname, 'ui');

const menubar = new Menubar({
  windowPosition: 'trayLeft',
  width: 300,
  height: 300,
  tooltip: 'Ulixee',
  iconPath,
  vueDistPath,
});

menubar.on('ready', () => {
  console.log('RUNNING MENUBAR');
});
