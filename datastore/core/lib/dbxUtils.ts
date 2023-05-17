import * as Fs from 'fs/promises';
import { PassThrough } from 'stream';
import * as Tar from 'tar';

export function unpackDbx(compressedDbx: Buffer, toDirectory: string): Promise<void> {
  const dbxStream = new PassThrough().end(compressedDbx);
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

export async function packDbx(fromDirectory: string): Promise<Buffer> {
  await Tar.create(
    {
      gzip: true,
      cwd: fromDirectory,
      file: `${fromDirectory}.tgz`,
    },
    ['datastore.js', 'datastore.js.map', 'datastore-manifest.json', 'docpage.json'],
  );
  const buffer = await Fs.readFile(`${fromDirectory}.tgz`);
  await Fs.unlink(`${fromDirectory}.tgz`);
  return buffer;
}

export async function unpackDbxFile(file: string, toDirectory: string): Promise<void> {
  await Tar.extract({
    file,
    cwd: toDirectory,
    preserveOwner: false,
  });
}
