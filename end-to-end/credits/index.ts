import '@ulixee/commons/lib/SourceMapSupport';
import * as Path from 'path';
import datastoreDev from './datastoreDev';
import dataUser from './dataUser';

async function main(): Promise<void> {
  const needsClosing: (() => Promise<any> | any)[] = [];
  let root = __dirname;
  while (!root.endsWith('/ulixee')) {
    root = Path.dirname(root);
    if (root === '/') throw new Error('Root project not found');
  }

  const buildDir = Path.join(root, 'build');
  try {
    const result = await datastoreDev(needsClosing, buildDir);
    await dataUser(result, buildDir);
    console.log('Completed!')
  } catch (error) {
    console.error(error);
  }
  for (const closer of needsClosing) {
    await closer();
  }
  process.exit();
}

main().catch(console.error);
