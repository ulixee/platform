import '@ulixee/commons/lib/SourceMapSupport';
import log from 'electron-log';
import { ChromeAlive } from './lib/ChromeAlive';

Object.assign(console, log.functions);

const chromeAlive = new ChromeAlive();

chromeAlive.on('ready', () => {
  console.warn('RUNNING CHROMEALIVE');
});

process.on('uncaughtException', error => {
  console.error(error);
});
