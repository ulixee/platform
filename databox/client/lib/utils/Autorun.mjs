// this hack allows DataboxWrapper's beforeExit to know if the mjs script has a default export

export function setupAutorunMjsHack(DataboxWrapper) {
  const module = import(process.argv[1]);
  module.then(x => {
    if (x.default instanceof DataboxWrapper) {
      DataboxWrapper.defaultExport = x.default;
    }
  });
}