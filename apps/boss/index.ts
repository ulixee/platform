import '@ulixee/commons/lib/SourceMapSupport';
import { Menubar } from './lib/Menubar';

if (process.argv.some(x => x.includes('--chromealive'))) {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  const { ChromeAlive } = require('@ulixee/apps-chromealive/lib/ChromeAlive');

  const chromealive = new ChromeAlive();
  chromealive.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING CHROMEALIVE');
  });
} else {
  const menubar = new Menubar({
    windowPosition: 'trayLeft',
    width: 300,
    height: 300,
    tooltip: 'Ulixee',
  });

  menubar.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING ULIXEE BOSS');
  });
}
