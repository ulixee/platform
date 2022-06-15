import cjsImport from './index.js';

const { Runner } = cjsImport;

export { Runner };

export default cjsImport.default;

//////////////////////////////////////////////////////////////////////////////////////////
// this hack allows DataboxWrapper's beforeExit to know if the mjs script has a default export

export function setupAutorunMjsHack() {
  const module = import(process.argv[1]);
  module.then(x => {
    if (x.default instanceof cjsImport.default) {
      cjsImport.default.defaultExport = x.default;
    }
  });
}

setupAutorunMjsHack();

