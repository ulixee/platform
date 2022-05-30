import DatabasePackager from '../index';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';
import * as Fs from 'fs/promises';

test('it should generate a relative script entrypoint', async () => {
  const packager = new DatabasePackager(`${__dirname}/assets/typescript/src/index.ts`);
  expect(packager.outputPath).toBe(
    `${getCacheDirectory()}/ulixee/databox/packager-test-assets-typescript-src-index`,
  );
  await packager.build();
  expect(packager.package.script).toBe(
    await Fs.readFile(packager.outputPath + '/databox.js', 'utf8'),
  );
  expect(packager.package.sourceMap).toBe(
    await Fs.readFile(packager.outputPath + '/databox.js.map', 'utf8'),
  );

  await expect(Fs.readFile(packager.outputPath + '/manifest.json', 'utf8')).resolves.toBeTruthy();

  expect(packager.package.manifest).toEqual({
    scriptEntrypoint: 'packager/test/assets/typescript/src/index.ts',
    scriptRollupHash: expect.any(String),
    databoxModule: '@ulixee/databox-for-hero',
    databoxModuleVersion: require('../package.json').version,
  });

  await Fs.rmdir(packager.outputPath, { recursive: true });
}, 45e3);
