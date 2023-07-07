import * as Fs from 'fs';
import { encodeBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import installDatastoreSchema, { addDatastoreAlias } from '../types/installDatastoreSchema';

beforeEach(() => {
  Fs.writeFileSync(
    `${__dirname}/../types/index.d.ts`,
    `import IItemInputOutput from '@ulixee/datastore/interfaces/IItemInputOutput';
export default interface ITypes extends Record<string, IItemInputOutput> {}`,
  );
});

it('can install a schema', async () => {
  const schema = `{
    input: {
      var1: string;
    };
    output: {
      test2?: string;
    };
  }`;
  installDatastoreSchema(schema, 'thisIsATest', '0.0.1');

  expect(Fs.existsSync(`${__dirname}/../types/thisIsATest@0.0.1.d.ts`)).toBe(true);
  expect(Fs.readFileSync(`${__dirname}/../types/index.d.ts`, 'utf8'))
    .toBe(`import IItemInputOutput from '@ulixee/datastore/interfaces/IItemInputOutput';
import thisIsATest_0_0_1 from './thisIsATest@0.0.1';
export default interface ITypes extends Record<string, IItemInputOutput> {
  "thisIsATest": thisIsATest_0_0_1;
}`);
});

it('can install multiple schemas', async () => {
  const schema1 = `{
    input: {
      var1: string;
    };
    output: {
      test2?: string;
    };
  }`;
  const schema2 = `{
    input: {
      vars: string;
    };
    output: {
      nothing: boolean;
    };
  }`;
  const id1 = encodeBuffer(sha256('schema1'), 'dbx');
  const id2 = encodeBuffer(sha256('schema2'), 'dbx');
  installDatastoreSchema(schema1, id1, '0.0.1');
  installDatastoreSchema(schema2, id2, '0.0.1');

  expect(Fs.existsSync(`${__dirname}/../types/${id1}@0.0.1.d.ts`)).toBe(true);
  expect(Fs.existsSync(`${__dirname}/../types/${id2}@0.0.1.d.ts`)).toBe(true);
  expect(Fs.readFileSync(`${__dirname}/../types/index.d.ts`, 'utf8'))
    .toBe(`import IItemInputOutput from '@ulixee/datastore/interfaces/IItemInputOutput';
import ${id1}_0_0_1 from './${id1}@0.0.1';
import ${id2}_0_0_1 from './${id2}@0.0.1';
export default interface ITypes extends Record<string, IItemInputOutput> {
  "${id1}": ${id1}_0_0_1;
  "${id2}": ${id2}_0_0_1;
}`);

  // test an alias
  addDatastoreAlias('short2', id2, '0.0.1');
  expect(Fs.readFileSync(`${__dirname}/../types/index.d.ts`, 'utf8'))
    .toBe(`import IItemInputOutput from '@ulixee/datastore/interfaces/IItemInputOutput';
import ${id1}_0_0_1 from './${id1}@0.0.1';
import ${id2}_0_0_1 from './${id2}@0.0.1';
export default interface ITypes extends Record<string, IItemInputOutput> {
  "${id1}": ${id1}_0_0_1;
  "${id2}": ${id2}_0_0_1;
  "short2": ${id2}_0_0_1;
}`);

  // test overwriting a value
  addDatastoreAlias('short2', id1, '0.0.1');
  expect(Fs.readFileSync(`${__dirname}/../types/index.d.ts`, 'utf8'))
    .toBe(`import IItemInputOutput from '@ulixee/datastore/interfaces/IItemInputOutput';
import ${id1}_0_0_1 from './${id1}@0.0.1';
import ${id2}_0_0_1 from './${id2}@0.0.1';
export default interface ITypes extends Record<string, IItemInputOutput> {
  "${id1}": ${id1}_0_0_1;
  "${id2}": ${id2}_0_0_1;
  "short2": ${id1}_0_0_1;
}`);
});
