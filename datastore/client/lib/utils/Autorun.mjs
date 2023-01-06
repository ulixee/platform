import Autorun from './Autorun';

// this hack allows DatastoreExecutable's beforeExit to know if the mjs script has a default export

export function setupAutorunMjsHack(DatastoreExecutable) {
  const module = import(process.argv[1]);
  module.then(x => {
    if (x.default instanceof DatastoreExecutable) {
      Autorun.defaultExport = x.default;
    }
  });
}
