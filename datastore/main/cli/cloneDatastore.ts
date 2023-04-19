// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import * as Path from 'path';
import jsonToSchemaCode from '@ulixee/schema/lib/jsonToSchemaCode';
import { nanoid } from 'nanoid';
import DatastoreApiClient from '../lib/DatastoreApiClient';

const { version } = require('../package.json');
const clonedPackageJson = require('./cloned-package.json');

clonedPackageJson.dependencies['@ulixee/datastore'] = version;
clonedPackageJson.devDependencies['@ulixee/datastore-packager'] = version;

export default async function cloneDatastore(
  url: string,
  directoryPath?: string,
  options: { embedCredits?: { id: string; secret: string } } = {},
): Promise<{ datastoreFilePath: string }> {
  const { datastoreVersionHash, host } = await DatastoreApiClient.resolveDatastoreDomain(url);
  if (url.includes('/free-credits')) {
    const credit = new URL(url).search.split(':');
    options.embedCredits = { id: credit[0], secret: credit[1] };
  }
  const datastoreApiClient = new DatastoreApiClient(host);
  const meta = await datastoreApiClient.getMeta(datastoreVersionHash, true);
  await datastoreApiClient.disconnect();
  const schemasByName: Record<string, { isTable: boolean; schemaJson: any }> = {};
  const imports = new Set<string>();

  const passthroughExtractors = Object.entries(meta.extractorsByName).map(([x, extractor]) => {
    let schemaLine = '';
    imports.add('PassthroughExtractor');
    if (extractor.schemaJson) {
      schemasByName[`${x}`] = { isTable: false, schemaJson: extractor.schemaJson };
      schemaLine = `\n  schema: ${x}(),\n`;
    }
    let descriptionLine = '';
    if (extractor.description) {
      descriptionLine = `\n  description: ${JSON.stringify(extractor.description)},\n`;
    }
    return `${x}: new PassthroughExtractor({
  remoteExtractor: 'source.${x}',${schemaLine}${descriptionLine}
})`;
  });

  const passthroughTables = Object.entries(meta.tablesByName).map(([x, table]) => {
    let schemaLine = '';
    imports.add('PassthroughTable');
    if (table.schemaJson) {
      schemasByName[`${x}`] = { isTable: true, schemaJson: table.schemaJson };
      schemaLine = `\n  schema: ${x}(),\n`;
    }

    let descriptionLine = '';
    if (table.description) {
      descriptionLine = `\n  description: ${JSON.stringify(table.description)},\n`;
    }

    return `${x}: new PassthroughTable({
  remoteTable: 'source.${x}',${schemaLine}${descriptionLine}
})`;
  });

  const schemaImports = new Set<string>();
  const schemaVars = Object.entries(schemasByName).map(([name, record]) => {
    const schema = record.schemaJson;
    if (record.isTable) {
      return `function ${name}() {\n  return ${jsonToSchemaCode(schema, schemaImports)};\n}\n`;
    }

    let js = `function ${name}() {\n return {\n`;
    if (schema.input) {
      js += `  input: ${jsonToSchemaCode(schema.input, schemaImports)}\n,`;
    }
    if (schema.output) {
      js += `  output: ${jsonToSchemaCode(schema.output, schemaImports)}`;
    }
    return `${js}};\n}\n`;
  });

  let remoteCredits = '';
  if (options.embedCredits) {
    const { id, secret } = options.embedCredits;
    remoteCredits = `
    remoteDatastoreEmbeddedCredits: {
      source: ${JSON.stringify({ id, secret })},
    },`;
  }

  const description = meta.description
    ? `\n    description: ${JSON.stringify(meta.description)},\n`
    : '';
  const script = `
  import { Datastore, ${[...imports].join(',')} } from '@ulixee/datastore';
  import schemaFromJson from '@ulixee/schema/lib/schemaFromJson';
  import { ${[...schemaImports].join(', ')} } from '@ulixee/schema';
  
  const datastore = new Datastore({
    name: ${JSON.stringify(meta.name)},${description}
    affiliateId: "aff${nanoid(12)}",
    remoteDatastores: {
      source: "${url}",
    },${remoteCredits}
    extractors: {
      ${passthroughExtractors}
    },
    tables: {
      ${passthroughTables}
    }
  });

  //////////// SCHEMA DEFINITIONS //////////////////
  ${schemaVars.join('\n')}

  export default datastore;`;

  let folder = Path.resolve(directoryPath || `./${meta.name ?? 'datastore'}`);
  if (!directoryPath) {
    let counter = 1;
    const baseFolder = folder;
    while (existsSync(folder)) folder += `${baseFolder}${counter++}`;
  }

  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
  if (!existsSync(Path.join(folder, 'package.json'))) {
    writeFileSync(
      Path.join(folder, 'package.json'),
      JSON.stringify(clonedPackageJson, null, 2),
      'utf8',
    );
  }
  if (!existsSync(Path.join(folder, 'tsconfig.json'))) {
    copyFileSync(`${__dirname}/cloned-tsconfig.json`, Path.join(folder, 'tsconfig.json'));
  }

  const datastoreFilepath = Path.join(folder, `datastore.ts`);
  const sourceFile = ts.createSourceFile(
    datastoreFilepath,
    script,
    ts.ScriptTarget.ES2020,
    false,
    ts.ScriptKind.TS,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, noEmitHelpers: true });
  const tsFile = printer.printFile(sourceFile);
  writeFileSync(datastoreFilepath, tsFile);
  return { datastoreFilePath: datastoreFilepath };
}
