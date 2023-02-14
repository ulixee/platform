import './lib/util/UlixeeLogger';
import '@ulixee/commons/lib/SourceMapSupport';
import log from 'electron-log';
import { app } from 'electron';
import { Menubar } from './lib/Menubar';

Object.assign(console, log.functions);

if (app.isPackaged) {
  process.env.DEBUG = [process.env.DEBUG ?? '', 'ulx:*'].filter(Boolean).join(',');
}

const { version } = require('./package.json');

if (process.argv.some(x => x.includes('--desktop'))) {

} else {
  const menubar = new Menubar({
    windowPosition: 'trayLeft',
    width: 300,
    height: 400,
    tooltip: 'Ulixee',
  });

  menubar.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING ULIXEE DESKTOP', version);
  });
}

process.on('uncaughtException', error => {
  console.error('Unhandled Exception in Desktop', error);
});
