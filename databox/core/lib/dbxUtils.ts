import * as Tar from 'tar';
import { PassThrough } from 'stream';

export function unpackDbx(compressedDatabox: Buffer, toDirectory: string): Promise<void> {
  const dbxStream = new PassThrough().end(compressedDatabox);
  return new Promise(resolve => {
    dbxStream
      .pipe(
        Tar.extract({
          cwd: toDirectory,
          preserveOwner: false,
        }),
      )
      .on('finish', resolve);
  });
}

export async function unpackDbxFile(
  file: string,
  toDirectory: string,
  unlink: boolean,
): Promise<void> {
  await Tar.extract({
    file,
    cwd: toDirectory,
    unlink,
    preserveOwner: false,
  });
}
