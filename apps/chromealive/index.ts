import { ChildProcess, spawn, SpawnOptions, StdioOptions } from 'child_process';

const launchPaths = {
  workspace: `yarn workspace @ulixee/apps-chromealive start`,
  desktop: process.execPath,
};

export default function launchChromeAlive(...launchArgs: string[]): ChildProcess {
  const stdio: StdioOptions = ['ignore', 'inherit', 'inherit', 'ipc'];

  const spawnOptions: SpawnOptions = {
    stdio,
    windowsHide: false,
    env: process.env,
  };

  const preferredLaunch = getPreferredLaunch();
  if (!preferredLaunch) return;
  if (preferredLaunch === 'workspace') spawnOptions.shell = true;

  const exe = launchPaths[preferredLaunch];

  const child = spawn(
    exe,
    ['--chromealive', `--${preferredLaunch}-launch`, ...launchArgs],
    spawnOptions,
  );

  child.unref();
  return child;
}

function getPreferredLaunch(): keyof typeof launchPaths {
  try {
    require.resolve('./app');
    // eslint-disable-next-line global-require
    const isPackaged = require('electron').app.isPackaged;
    if (isPackaged) return 'desktop';
  } catch (err) {
    // not installed locally
  }

  const forceBinary = JSON.parse(process.env.ULX_CHROMEALIVE_USE_BINARY ?? 'false');
  if (!forceBinary) {
    try {
      require.resolve('./app');
      return 'workspace';
    } catch (err) {
      // not installed locally
    }
  }
}
