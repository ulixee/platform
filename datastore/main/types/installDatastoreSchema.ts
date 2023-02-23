import * as Fs from 'fs';

const emptyJsFile = `"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });`;

export default function installDatastoreSchema(schemaInterface: string, datastoreVersionHash: string): void {
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
      `${__dirname}/${datastoreVersionHash}.d.ts`,
      `export default interface ISchema ${schemaInterface}`,
    );
    // add a js file so you can import
    Fs.writeFileSync(`${__dirname}/${datastoreVersionHash}.js`, emptyJsFile);
  }
  addTypeReference(datastoreVersionHash, datastoreVersionHash);
}

function addTypeReference(name: string, datastoreVersionHash: string): void {
  let source = Fs.readFileSync(`${__dirname}/index.d.ts`, 'utf8');
  if (!source.includes(`import ${datastoreVersionHash}`)) {
    source = source.replace(
      `\nexport default interface`,
      `\nimport ${datastoreVersionHash} from './${datastoreVersionHash}';\nexport default interface`,
    );
  }

  if (source.includes(`"${name}":`)) {
    source = source.replace(new RegExp(`"${name}": [a-zA-Z0-9_]+;`), `"${name}": ${datastoreVersionHash};`);
  } else {
    source = source
      .replace('{}', '{\n}')
      .replace(/(}[\n\s]*)$/, `  "${name}": ${datastoreVersionHash};\n$1`);
  }
  Fs.writeFileSync(`${__dirname}/index.d.ts`, source);
}

export function addDatastoreAlias(datastoreVersionHash: string, aliasName: string): void {
  addTypeReference(aliasName, datastoreVersionHash);
}
