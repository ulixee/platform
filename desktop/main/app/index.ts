import './lib/util/defaultEnvVars';
import './lib/util/UlixeeLogger';
import '@ulixee/commons/lib/SourceMapSupport';
import { app } from 'electron';
import { Menubar } from './lib/Menubar';


process.env.DEVTOOLS_PORT ??= '8315';
app.commandLine.appendSwitch('remote-debugging-port', process.env.DEVTOOLS_PORT);

const { version } = require('./package.json');

const menubar = new Menubar({
  width: 300,
  height: 325,
  tooltip: 'Ulixee',
});

menubar.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log('RUNNING ULIXEE DESKTOP', version);
});
