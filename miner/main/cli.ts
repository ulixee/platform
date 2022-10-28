import { Command } from 'commander';
import { filterUndefined } from '@ulixee/commons/lib/objectUtils';
import { applyEnvironmentVariables, parseEnvBool } from '@ulixee/commons/lib/envUtils';
import * as Path from 'path';
import UlixeeMiner from './index';
import UlixeeMinerEnv from './env';

const pkg = require('./package.json');

export default function cliCommands(): Command {
  const program = new Command().version(pkg.version);

  program
    .command('start', { isDefault: true })
    .description('start a Ulixee Miner')
    .addOption(
      program
        .createOption('-p, --port <number>', 'The port to use. Defaults to any available port.')
        .env('PORT'),
    )
    .addOption(
      program.createOption(
        '-h, --host <host>',
        'The host the miner should listen on. (default: localhost)',
      ),
    )
    .addOption(
      program.createOption('-e, --env <file>', 'Load environment settings from a .env file.'),
    )
    .addOption(
      program
        .createOption(
          '-x, --disable-chrome-alive',
          'Do not enable ChromeAlive! even if installed locally.',
        )
        .argParser(parseEnvBool)
        .env('ULX_DISABLE_CHROMEALIVE'),
    )
    .addOption(
      program
        .createOption(
          '-m, --max-concurrent-heroes <count>',
          'Max number of concurrent Databoxes/Heroes to run at a time.',
        )
        .argParser(parseInt)
        .default(10),
    )
    .addOption(
      program
        .createOption(
          '-r, --max-databox-runtime-ms <millis>',
          'Max runtime allowed for a Databox to complete. (default: 10 mins)',
        )
        .argParser(parseInt),
    )
    .addOption(
      program.createOption(
        '-u, --unblocked-plugins <plugins...>',
        'Register default Unblocked Plugin npm module names for all Hero instances to load.',
      ),
    )
    .addOption(
      program
        .createOption(
          '-d, --hero-data-dir <dir>',
          'Override the default data directory for Hero sessions and dbs.',
        )
        .env('ULX_DATA_DIR'),
    )
    .addOption(
      program
        .createOption(
          '-s, --databox-storage-dir <dir>',
          'Override the default storage directory where Databoxes are located.',
        )
        .env('ULX_DATABOX_DIR'),
    )
    .addOption(
      program.createOption(
        '-t, --databox-tmp-dir <dir>',
        'Override the default temp directory where uploaded Databoxes are processed.',
      ),
    )
    .addOption(
      program
        .createOption(
          '-w, --databox-wait-for-completion',
          'Wait for all in-process Databoxes to complete before shutting down the Miner.',
        )
        .default(false),
    )
    .allowUnknownOption(true)
    .action(async opts => {
      console.log('Starting Ulixee Miner with configuration:', opts);
      const { port, disableChromeAlive, host, env } = opts;
      if (env) {
        applyEnvironmentVariables(Path.resolve(env), process.env);
      }
      if (disableChromeAlive) UlixeeMinerEnv.disableChromeAlive = disableChromeAlive;

      const miner = new UlixeeMiner(host);

      const { unblockedPlugins, heroDataDir, maxConcurrentHeroes } = opts;
      miner.router.heroConfiguration = filterUndefined({
        maxConcurrentClientCount: maxConcurrentHeroes,
        dataDir: heroDataDir,
        defaultUnblockedPlugins: unblockedPlugins?.map(x => {
          // eslint-disable-next-line import/no-dynamic-require
          const mod: any = require(x);
          if (mod.default) return mod.default;
          return mod;
        }),
      });

      miner.router.databoxConfiguration = filterUndefined({
        databoxesDir: opts.databoxStorageDir,
        databoxesTmpDir: opts.databoxTmpDir,
        maxRuntimeMs: opts.maxDataboxRuntimeMs,
        waitForDataboxCompletionOnShutdown: opts.databoxWaitForCompletion,
      });

      await miner.listen({ port });
      console.log('Ulixee Miner listening at %s', await miner.address);
    });

  return program;
}
