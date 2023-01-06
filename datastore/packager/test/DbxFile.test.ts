import * as Fs from 'fs/promises';
import { existsSync } from 'fs';
import DatastorePackager from '../index';
import DbxFile from '../lib/DbxFile';

test('can load and manipulate a working directory', async () => {
  const packager = new DatastorePackager(`${__dirname}/assets/dbxTest1.js`);
  await packager.build();
  const newScript = `const { Function, HeroFunctionPlugin } = require("@ulixee/datastore-plugins-hero");
module.exports=new Function(({output}) => {
  output.text='test';
}, HeroFunctionPlugin);`;

  const dbxFile = new DbxFile(packager.dbxPath);
  await dbxFile.open();
  await Fs.writeFile(`${dbxFile.workingDirectory}/datastore.js`, newScript);
  await dbxFile.save();
  expect(existsSync(`${__dirname}/assets/dbxTest1.dbx`)).toBeTruthy();
  await dbxFile.close();
  expect(existsSync(dbxFile.workingDirectory)).toBeFalsy();

  await dbxFile.open();

  const scriptContents = await Fs.readFile(`${dbxFile.workingDirectory}/datastore.js`, 'utf8');

  expect(scriptContents).toBe(newScript);
  await dbxFile.close();
});
