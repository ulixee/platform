import './lib/util/UlixeeLogger';
import '@ulixee/commons/lib/SourceMapSupport';
import { app } from 'electron';
import { Menubar } from './lib/Menubar';

if (app.isPackaged) {
  process.env.DEBUG = [process.env.DEBUG ?? '', 'ulx:*'].filter(Boolean).join(',');
}

const { version } = require('./package.json');

if (process.argv.some(x => x.includes('--desktop'))) {
} else {
  const menubar = new Menubar({
    windowPosition: 'trayLeft',
    width: 300,
    height: 325,
    tooltip: 'Ulixee',
  });

  menubar.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING ULIXEE DESKTOP', version);
  });
}
