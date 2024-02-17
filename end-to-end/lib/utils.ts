import { execSync, ExecSyncOptions } from 'node:child_process';
import * as Path from 'node:path';

export function execAndLog(command: string, options?: ExecSyncOptions): string {
  options ??= {};
  options.encoding ??= 'utf8';
  const result = execSync(command, options) as string;
  console.log(`$ ${command}\n\n`, result);
  return result;
}

export function getPlatformBuild(): string {
  let root = __dirname;
  while (!root.endsWith(`${Path.sep}platform`)) {
    root = Path.dirname(root);
    if (root === '/') throw new Error('Root project not found');
  }

  return Path.join(root, 'build');
}
