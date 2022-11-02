import '@ulixee/commons/lib/SourceMapSupport';
import { app } from 'electron';
import { Menubar } from './lib/Menubar';

if (app.isPackaged) {
  process.env.DEBUG = [process.env.DEBUG ?? '', 'ulx:*'].filter(Boolean).join(',');
}

require('./lib/util/UlixeeLogger');
const { version } = require('./package.json');

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
