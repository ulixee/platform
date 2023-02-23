import Autorun from './Autorun.js';

// this hack allows DatastoreExecutable's beforeExit to know if the mjs script has a default export

export function setupAutorunMjsHack() {
  const module = import(process.argv[1]);
  module.then(x => {
    Autorun.default.setupAutorunBeforeExitHook({ exports: x });
  });
}
