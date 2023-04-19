import { ChildProcess, execSync, ExecSyncOptions } from 'child_process';

export function getCloudAddress(cloudNodeProcess: ChildProcess): Promise<string> {
  return new Promise<string>(resolve => {
    cloudNodeProcess.stderr.setEncoding('utf8');
    cloudNodeProcess.stderr.on('data', console.error);
    cloudNodeProcess.stdout.setEncoding('utf8');
    cloudNodeProcess.stdout.on('data', (message: string) => {
      console.log('[DATASTORE CORE]', message.trim());
      const match = message.match(/Ulixee Cloud listening at (.+)/);
      if (match?.length) resolve(match[1]);
    });
  });
}

export function execAndLog(command: string, options?: ExecSyncOptions): string {
  console.log(`--------\n\n\n${command}\n\n\n-------`);
  options ??= {};
  options.encoding ??= 'utf8';
  return execSync(command, options) as string;
}
