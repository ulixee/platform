import * as Fs from 'fs';

const emptyJsFile = `"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });`;

export default function installSchemaType(schemaInterface: string, versionHash: string): void {
  // don't install a broken schema
  if (!schemaInterface.startsWith('{') || !schemaInterface.endsWith('}')) {
    console.warn(
      'The requested schema interface cannot be installed - it must be a full type.',
      schemaInterface,
    );
    return;
  }
  if (!schemaInterface.includes('input: ') && !schemaInterface.includes('output: ')) {
    console.warn(
      'The requested schema interface cannot be installed - it must include either an input or an output specification.',
      schemaInterface,
    );
    return;
  }
  if (schemaInterface) {
    Fs.writeFileSync(
      `${__dirname}/${versionHash}.d.ts`,
      `export default interface ISchema ${schemaInterface}`,
    );
    // add a js file so you can import
    Fs.writeFileSync(`${__dirname}/${versionHash}.js`, emptyJsFile);
  }
  addTypeReference(versionHash, versionHash);
}

function addTypeReference(name: string, versionHash: string): void {
  let source = Fs.readFileSync(`${__dirname}/index.d.ts`, 'utf8');
  if (!source.includes(`import ${versionHash}`)) {
    source = source.replace(
      `\nexport default interface`,
      `\nimport ${versionHash} from './${versionHash}';\nexport default interface`,
    );
  }

  if (source.includes(`"${name}":`)) {
    source = source.replace(new RegExp(`"${name}": [a-zA-Z0-9_]+;`), `"${name}": ${versionHash};`);
  } else {
    source = source
      .replace('{}', '{\n}')
      .replace(/(}[\n\s]*)$/, `  "${name}": ${versionHash};\n$1`);
  }
  Fs.writeFileSync(`${__dirname}/index.d.ts`, source);
}

export function addSchemaAlias(versionHash: string, aliasName: string): void {
  addTypeReference(aliasName, versionHash);
}
