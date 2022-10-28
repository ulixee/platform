import {
  ChildProcess, execSync,
  ExecSyncOptions,
  ExecSyncOptionsWithBufferEncoding,
  ExecSyncOptionsWithStringEncoding,
} from 'child_process';

export function getMinerHost(minerProcess: ChildProcess): Promise<string> {
  return new Promise<string>(resolve => {
    minerProcess.stderr.setEncoding('utf8');
    minerProcess.stderr.on('data', console.error);
    minerProcess.stdout.setEncoding('utf8');
    minerProcess.stdout.on('data', (message: string) => {
      console.log('[DATABOX CORE]', message.trim());
      const match = message.match(/Ulixee Miner listening at (.+)/);
      if (match?.length) resolve(match[1]);
    });
  });
}

export function execAndLog(command: string): Buffer;
export function execAndLog(command: string, options: ExecSyncOptionsWithStringEncoding): string;
export function execAndLog(command: string, options: ExecSyncOptionsWithBufferEncoding): Buffer;
export function execAndLog(command: string, options?: ExecSyncOptions): string | Buffer {
  console.log(`--------\n\n\n${command}\n\n\n-------`);
  return execSync(command, options);
}
