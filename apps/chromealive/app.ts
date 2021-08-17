import * as Path from 'path';
import { app } from 'electron';
import { ChromeAlive } from './lib/ChromeAlive';

if (!app.requestSingleInstanceLock()) {
  console.log('ChromeAlive! already opened. Exiting new process.');
  app.exit();
}

const vueDistPath = Path.resolve(__dirname, 'ui');

const coreServerAddress = process.argv
  .find(x => x.startsWith('--coreServerAddress='))
  ?.replace('--coreServerAddress=', '');

const chromeAlive = new ChromeAlive(vueDistPath, coreServerAddress);

chromeAlive.on('ready', () => {
  console.log('RUNNING CHROMEALIVE');

  process.once('exit', exit);
  process.once('SIGTERM', exit);
  process.once('SIGINT', exit);
  process.once('SIGQUIT', exit);

  process.on('message', message => {
    console.log('Got message', message);
    if (message === 'exit') {
      exit();
    }
  });
});

function exit() {
  console.log('EXITING CHROMEALIVE!');
  app.exit();
}
