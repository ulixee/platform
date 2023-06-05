import { existsAsync } from '@ulixee/commons/lib/fileUtils';
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
  const file = `${fromDirectory}.tgz`;
  if (!(await existsAsync(file))) {
    await Tar.create(
      {
        gzip: true,
        cwd: fromDirectory,
        file,
      },
      ['datastore.js', 'datastore.js.map', 'datastore-manifest.json', 'docpage.json'],
    );
  }
  return await Fs.readFile(file);
}

export async function unpackDbxFile(file: string, toDirectory: string): Promise<void> {
  await Tar.extract({
    file,
    cwd: toDirectory,
    preserveOwner: false,
  });
}
