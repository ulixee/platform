import * as Fs from 'fs';

const emptyJsFile = `"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });`;

export default function installDatastoreSchema(
  schemaInterface: string,
  datastoreId: string,
  datastoreVersion: string,
): void {
  // don't install a broken schema
  if (!schemaInterface.startsWith('{') || !schemaInterface.endsWith('}')) {
    console.warn(
      'The requested schema interface cannot be installed - it must be a full type.',
      schemaInterface,
    );
    return;
  }

  if (schemaInterface) {
    Fs.writeFileSync(
      `${__dirname}/${datastoreId}@${datastoreVersion}.d.ts`,
      `export default interface ISchema ${schemaInterface}`,
    );
    // add a js file so you can import
    Fs.writeFileSync(`${__dirname}/${datastoreId}@${datastoreVersion}.js`, emptyJsFile);
  }
  addTypeReference(datastoreId, datastoreId, datastoreVersion);
}

function addTypeReference(name: string, datastoreId: string, datastoreVersion: string): void {
  let source = Fs.readFileSync(`${__dirname}/index.d.ts`, 'utf8');

  const varName = `${datastoreId}_${datastoreVersion}`.replaceAll('.', '_');
  if (!source.includes(`import ${varName}`)) {
    source = source.replace(
      `\nexport default interface`,
      `\nimport ${varName} from './${datastoreId}@${datastoreVersion}';\nexport default interface`,
    );
  }

  if (source.includes(`"${name}":`)) {
    source = source.replace(new RegExp(`"${name}": [a-zA-Z0-9_]+;`), `"${name}": ${varName};`);
  } else {
    source = source.replace('{}', '{\n}').replace(/(}[\n\s]*)$/, `  "${name}": ${varName};\n$1`);
  }
  Fs.writeFileSync(`${__dirname}/index.d.ts`, source);
}

export function addDatastoreAlias(
  aliasName: string,
  datastoreId: string,
  datastoreVersion: string,
): void {
  addTypeReference(aliasName, datastoreId, datastoreVersion);
}
