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
    .option('-p, --port <number>', 'The port to use. Defaults to any available port.')
    .option('-h, --host <host>', 'The host the server should listen on. (default: localhost)')
    .option('-x, --disable-chrome-alive', 'Do not enable ChromeAlive! even if installed locally.')
    .option(
      '-m, --max-concurrent-heroes <count>',
      'Max number of concurrent Databoxes/Heroes to run at a time.',
      parseInt,
      10,
    )
    .option(
      '-r, --max-databox-runtime-ms <millis>',
      'Max runtime allowed for a Databox to complete. (default: 10 mins)',
      parseInt,
    )
    .option(
      '-u, --unblocked-plugins <plugins...>',
      'Register default Unblocked Plugin npm module names for all Hero instances to load.',
    )
    .option(
      '-d, --hero-data-dir <dir>',
      'Override the default data directory for Hero sessions and dbs.',
    )
    .option(
      '-s, --databox-storage-dir <dir>',
      'Override the default storage directory where Databoxes are located.',
    )
    .option(
      '-t, --databox-tmp-dir <dir>',
      'Override the default temp directory where uploaded Databoxes are processed.',
    )
    .option(
      '-w, --databox-wait-for-completion',
      'Wait for all in-process Databoxes to complete before shutting down a server.',
      Boolean,
      false,
    )
    .allowUnknownOption(true)
    .action(async opts => {
      console.log('Starting Ulixee Server with configuration:', opts);
      const { port, disableChromeAlive, host } = opts;
      if (disableChromeAlive) UlixeeServerEnv.disableChromeAlive = disableChromeAlive;

      const server = new UlixeeServer(host);
      await server.listen({ port });

      const { unblockedPlugins, heroDataDir, maxConcurrentHeroes } = opts;
      server.router.heroConfiguration = {
        maxConcurrentClientCount: maxConcurrentHeroes,
        dataDir: heroDataDir,
        defaultUnblockedPlugins: unblockedPlugins?.map(x => {
          // eslint-disable-next-line import/no-dynamic-require
          const mod: any = require(x);
          if (mod.default) return mod.default;
          return mod;
        }),
      };
      server.router.databoxConfiguration = {
        databoxesDir: opts.databoxStorageDir,
        databoxesTmpDir: opts.databoxTmpDir,
        maxRuntimeMs: opts.maxDataboxRuntimeMs,
        waitForDataboxCompletionOnShutdown: opts.databoxWaitForCompletion,
      };

      console.log('Ulixee Server listening at %s', await server.address);
      ShutdownHandler.register(() => server.close());
    });

  return program;
}
