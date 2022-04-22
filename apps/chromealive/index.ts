import { ChildProcess, spawn, SpawnOptions, StdioOptions } from 'child_process';
import {
  getBinaryPath,
  getLocalBuildPath,
  isBinaryInstalled,
  isLocalBuildPresent,
} from './install/Utils';

const launchPaths = {
  local: getLocalBuildPath(),
  binary: getBinaryPath(),
  workspace: `yarn workspace @ulixee/apps-chromealive start`,
  desktop: process.execPath,
};

export default function launchChromeAlive(...launchArgs: string[]): ChildProcess {
  const stdio: StdioOptions = ['ignore', 'inherit', 'inherit', 'ipc'];

  const spawnOptions: SpawnOptions = {
    stdio,
    windowsHide: false,
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

function getPreferredLaunch(): 'local' | 'workspace' | 'binary' | 'desktop' {
  if (isLocalBuildPresent()) {
    return 'local';
  }

  if (isBinaryInstalled()) {
    return 'binary';
  }

  try {
    require.resolve('./app');
    // eslint-disable-next-line global-require
    const isPackaged = require('electron').app.isPackaged;
    if (isPackaged) return 'desktop';
  } catch (err) {
    // not installed locally
  }

  const forceBinary = JSON.parse(process.env.ULX_USE_CHROMEALIVE_BINARY ?? 'false');
  if (!forceBinary) {
    try {
      require.resolve('./app');
      return 'workspace';
    } catch (err) {
      // not installed locally
    }
  }
}
