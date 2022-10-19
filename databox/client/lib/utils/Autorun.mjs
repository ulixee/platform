import Autorun from './Autorun';

// this hack allows DataboxExecutable's beforeExit to know if the mjs script has a default export

export function setupAutorunMjsHack(DataboxExecutable) {
  const module = import(process.argv[1]);
  module.then(x => {
    if (x.default instanceof DataboxExecutable) {
      Autorun.defaultExport = x.default;
    }
  });
}