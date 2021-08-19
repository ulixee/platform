import { app } from 'electron';
import { ChromeAlive } from './lib/ChromeAlive';

const coreServerAddress = process.argv
  .find(x => x.startsWith('--coreServerAddress='))
  ?.replace('--coreServerAddress=', '');

const chromeAlive = new ChromeAlive(coreServerAddress);

chromeAlive.on('ready', () => {
  console.warn('RUNNING CHROMEALIVE');

  process.once('exit', exit);
  process.once('SIGTERM', exit);
  process.once('SIGINT', exit);
  process.once('SIGQUIT', exit);

  process.on('message', message => {
    if (message === 'exit') {
      exit();
    }
  });
});

function exit() {
  console.warn('EXITING CHROMEALIVE!');
  app.exit();
}
