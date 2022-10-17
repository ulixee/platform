import '@ulixee/commons/lib/SourceMapSupport';
import { fork, spawnSync } from 'child_process';
import * as Path from 'path';
import databoxDev from './databoxDev';
import dataUser from './dataUser';

async function main(): Promise<void> {
  const sidechainHost = 'http://localhost:1337';
  const needsClosing: (() => Promise<any> | any)[] = [];
  // configure prefixes to be unique
  // start sidechain server
  let root = __dirname;
  while (!root.endsWith('/ulixee')) {
    root = Path.dirname(root);
    if (root === '/') throw new Error('Root project not found');
  }
  const sidechainRoot = Path.resolve(`${root}/../payments/build/sidechain/server`);
  console.log('Initializing Sidechain db');

  process.env.PGDATABASE = 'ulx_e2e_sidechain';
  process.env.MICRONOTE_BATCH_DB_PREFIX = 'ulx_e2e_batch';

  spawnSync(`yarn migrate`, {
    shell: true,
    stdio: 'inherit',
    cwd: sidechainRoot,
    env: {
      ...process.env,
    },
  });

  console.log('Starting Sidechain', sidechainRoot);
  const server = fork(`index.js`, {
    stdio: 'inherit',
    cwd: sidechainRoot,
    env: {
      ...process.env,
      SIDECHAIN_HOST: sidechainHost,
    },
  });
  needsClosing.push(() => server.kill());

  const buildDir = Path.join(root, 'build');
  const result = await databoxDev(sidechainHost, needsClosing, buildDir);
  await dataUser(sidechainHost, result, buildDir);

  for (const closer of needsClosing) {
    await closer();
  }
  // TODO: destroy dbs
}

main().catch(console.error);
