// eslint-disable-next-line import/no-extraneous-dependencies
import * as ts from 'typescript';
import { writeFileSync } from 'fs';
import * as Path from 'path';
import jsonToSchemaCode from '@ulixee/schema/lib/jsonToSchemaCode';
import DatastoreApiClient from '../lib/DatastoreApiClient';

export default async function cloneDatastore(
  url: string,
  path: string,
  options: { emitModules: boolean } = { emitModules: false },
): Promise<void> {
  const parsedUrl = new URL(url);
  const datastoreApiClient = new DatastoreApiClient(parsedUrl.host);
  const meta = await datastoreApiClient.getMeta(parsedUrl.pathname.slice(1));
  path = Path.resolve(path);

  const schemas: Record<string, string> = {};
  const passthroughFunctions = Object.entries(meta.functionsByName).map(([x, func]) => {
    let schemaLine = '';
    if (func.schemaJson) {
      schemas[`${x}Schema`] = func.schemaJson;
      schemaLine = `\n  schema: ${x}Schema,\n`;
    }
    return `${x}: new PassthroughFunction({
  remoteFunction: 'source.${x}',${schemaLine}
})`;
  });

  const schemaImports = new Set<string>();
  const schemaVars = Object.entries(schemas).map(([name, json]) => {
    const schema = JSON.parse(json);
    let js = `var ${name} = {\n`;

    if (schema.input) {
      js += `  input: ${jsonToSchemaCode(schema.input, schemaImports)}\n,`;
    }
    if (schema.output) {
      js += `  output: ${jsonToSchemaCode(schema.output, schemaImports)}`;
    }
    return `${js}};\n`;
  });

  const script = `
  import { Datastore, PassthroughFunction } from '@ulixee/datastore';
  import schemaFromJson from '@ulixee/schema/lib/schemaFromJson';
  import { ${[...schemaImports].join(', ')} } from '@ulixee/schema';
  
  const datastore = new Datastore({
    remoteDatastores: {
      source: "${url}"
    },
    functions: {
      ${passthroughFunctions}
    }
  });

  //////////// SCHEMA DEFINITIONS //////////////////
  ${schemaVars.join('\n')}

  export default datastore;`;

  const sourceFile = ts.createSourceFile(
    path,
    script,
    ts.ScriptTarget.ES2020,
    false,
    ts.ScriptKind.TS,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, noEmitHelpers: true });
  const tsFile = printer.printFile(sourceFile);

  if (path.endsWith('.ts')) {
    writeFileSync(path, tsFile);
  } else {
    const jsFile = ts.transpileModule(tsFile, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: options.emitModules ? ts.ModuleKind.ES2022 : ts.ModuleKind.CommonJS,
        esModuleInterop: false,
        noImplicitUseStrict: true,
        strict: false,
        lib: ['es2022'],
      },
    });
    console.log(jsFile);
    writeFileSync(path, jsFile.outputText);
  }
}
