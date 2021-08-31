import './lib/util/UlixeeLogger';
import '@ulixee/commons/lib/SourceMapSupport';
import debug from 'debug';
import log from 'electron-log';
import { Menubar } from './lib/Menubar';

Object.assign(console, log.functions);
debug.log = log.debug.bind(log);
debug.enable('ulixee:*');
debug.formatArgs = function (args) {
  const name = this.namespace;
  args[0] = `[${name}] ${args[0].split('\n').join(`\n                       ${name} `)}`;
  args.push(debug.humanize(this.diff));
};

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
    height: 325,
    tooltip: 'Ulixee',
  });

  menubar.on('ready', () => {
    // eslint-disable-next-line no-console
    console.log('RUNNING ULIXEE BOSS');
  });
}
