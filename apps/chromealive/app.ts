import '@ulixee/commons/lib/SourceMapSupport';
import { ChromeAlive } from './lib/ChromeAlive';

const chromeAlive = new ChromeAlive();

chromeAlive.on('ready', () => {
  console.warn('RUNNING CHROMEALIVE');
});
