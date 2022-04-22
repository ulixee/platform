import './lib/util/UlixeeLogger';
import '@ulixee/commons/lib/SourceMapSupport';
import log from 'electron-log';
import { Menubar } from './lib/Menubar';
import { app } from 'electron';

const { version } = require('./package.json');
Object.assign(console, log.functions);

if (app.isPackaged) {
  process.env.DEBUG = [process.env.DEBUG ?? '', 'ulixee:*'].filter(Boolean).join(',');
}

if (process.argv.some(x => x.includes('--chromealive'))) {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  const { ChromeAlive } = require('@ulixee/apps-chromealive/lib/ChromeAlive');

  const chromealive = new ChromeAlive();
  chromealive.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING CHROMEALIVE', version);
  });
} else {
  const menubar = new Menubar({
    windowPosition: 'trayLeft',
    width: 300,
    height: 380,
    tooltip: 'Ulixee',
  });

  menubar.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING ULIXEE.APP', version);
  });
}
