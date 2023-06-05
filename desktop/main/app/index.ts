import '@ulixee/commons/lib/SourceMapSupport';
import { app } from 'electron';
import { Menubar } from './lib/Menubar';
import './lib/util/UlixeeLogger';
import './lib/util/defaultEnvVars';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.DEVTOOLS_PORT ??= '8315';
app.commandLine.appendSwitch('remote-debugging-port', process.env.DEVTOOLS_PORT);

const { version } = require('./package.json');

const menubar = new Menubar({
  width: 300,
  height: 300,
  tooltip: 'Ulixee',
});

menubar.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log('RUNNING ULIXEE DESKTOP', version);
});
