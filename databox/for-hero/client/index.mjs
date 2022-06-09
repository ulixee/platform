import cjsImport from './index.js';

const { Observable, Runner, Extractor } = cjsImport;

export { Observable, Runner, Extractor };

// this hack allows DataboxWrapper's beforeExit to know if the mjs script has a default export
const module = import(process.argv[1]);
module.then(x => {
  if (x.default instanceof cjsImport.default) {
    cjsImport.default.defaultExport = x.default;
  }
});

export default cjsImport.default;
