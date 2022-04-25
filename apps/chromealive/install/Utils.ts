import * as Path from 'path';
import * as Fs from 'fs';
import * as os from 'os';
import * as compareVersions from 'compare-versions';

const packageJson = require('../package.json');

const { version } = packageJson;

export { version };

export function recordVersion(): void {
  Fs.writeFileSync(`${getInstallDirectory()}/version`, version);
}

export function getInstallDirectory(): string {
  return Path.join(__dirname, '..', 'dist');
}

function getPlatformExecutable(): string {
  const platform = process.env.npm_config_platform || os.platform();

  switch (platform) {
    case 'mas':
    case 'darwin':
      return 'ChromeAlive!.app/Contents/MacOS/ChromeAlive!';
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return `chromealive-${version}-linux/ChromeAlive!`;
    case 'win32':
      return `chromealive-${version}-win/ChromeAlive!.exe`;
    default:
      throw new Error(`ChromeAlive! builds are not available on platform: ${platform}`);
  }
}

/////// DISTRIBUTED BINARY /////////////////////////////////////////////////////////////////////////////////////////////

export function isBinaryInstalled(): boolean {
  try {
    const installedVersion = Fs.readFileSync(`${getInstallDirectory()}/version`, 'utf-8').trim();
    const isCurrentVersionValid = compareVersions.compare(installedVersion, version, '>=');
    if (!isCurrentVersionValid) {
      return false;
    }
  } catch (ignored) {
    return false;
  }

  return Fs.existsSync(getBinaryPath());
}

export function getBinaryPath(): string {
  const platformPath = getPlatformExecutable();
  return Path.join(getInstallDirectory(), platformPath);
}

/////// LOCAL BUILD ////////////////////////////////////////////////////////////////////////////////////////////////////

export function isLocalBuildPresent(): boolean {
  return Fs.existsSync(getLocalBuildPath());
}

export function getLocalBuildPath(): string {
  const platformPath = getPlatformExecutable();

  const platform = process.env.npm_config_platform || os.platform();
  let distDir = Path.join(__dirname, '..', 'dist');

  // add-on the electron mac wrapping folder (differs from binary, which wraps the .app file directly)
  if (platform === 'darwin' || platform === 'mas') {
    let electronBuilderMacDirectory = 'mac';
    if (os.arch() === 'arm64') electronBuilderMacDirectory = 'mac-arm64';
    distDir = Path.join(distDir, electronBuilderMacDirectory);
  }

  return Path.join(distDir, platformPath);
}
