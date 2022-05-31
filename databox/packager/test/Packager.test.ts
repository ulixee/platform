import DatabasePackager from '../index';
import * as Fs from 'fs/promises';
import * as Path from 'path';

test('it should generate a relative script entrypoint', async () => {
  const packager = new DatabasePackager(`${__dirname}/assets/typescript/src/index.ts`);
  expect(packager.outputPath).toBe(
    Path.resolve(`${__dirname}/assets/typescript/src/.databox/index`),
  );
  await packager.build();
  expect(packager.package.script).toBe(
    await Fs.readFile(packager.outputPath + '/databox.js', 'utf8'),
  );
  expect(packager.package.sourceMap).toBe(
    await Fs.readFile(packager.outputPath + '/databox.js.map', 'utf8'),
  );

  await expect(Fs.readFile(packager.outputPath + '/manifest.json', 'utf8')).resolves.toBeTruthy();

  const sl = Path.sep;
  expect(packager.package.manifest).toEqual({
    scriptEntrypoint: Path.join(`packager`, `test`, `assets`, `typescript`, `src`, `index.ts`),
    scriptRollupHash: expect.any(String),
    databoxModule: '@ulixee/databox-for-hero',
    databoxModuleVersion: require('../package.json').version,
  });

  await Fs.rmdir(packager.outputPath, { recursive: true });
}, 45e3);
