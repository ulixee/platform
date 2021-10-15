import { promises as Fs } from 'fs';
import * as Os from 'os';

export async function existsAsync(path: string): Promise<boolean> {
  try {
    await Fs.access(path);
    return true;
  } catch (_) {
    return false;
  }
}

export async function readFileAsJson<T>(path: string): Promise<T> {
  const buffer = await Fs.readFile(path, 'utf8');
  return JSON.parse(buffer) as T;
}

const homeDirReplace = new RegExp(Os.homedir(), 'g');

export function cleanHomeDir(str: string): string {
  return str.replace(homeDirReplace, '~');
}
