import { Command } from 'commander';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import UlixeeServer from './index';
import UlixeeServerEnv from './env';

const pkg = require('./package.json');

export default function cliCommands(): Command {
  const program = new Command().version(pkg.version);

  program
    .command('start', { isDefault: true })
    .description('start a Ulixee Server')
    .option('-p, --port', 'The port to use. Defaults to any available port.')
    .option('-x, --disable-chrome-alive', 'Do not enable ChromeAlive! even if installed locally.')
    .action(async opts => {
      const { port, disableChromeAlive } = opts;
      if (disableChromeAlive) UlixeeServerEnv.disableChromeAlive = disableChromeAlive;

      const server = new UlixeeServer();
      await server.listen({ port });

      console.log('Ulixee Server listening at %s', await server.address);
      ShutdownHandler.register(() => server.close());
    });

  return program;
}
