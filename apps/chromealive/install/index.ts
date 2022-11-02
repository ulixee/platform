#!/usr/bin/env node

import * as Fs from 'fs';
import * as Tar from 'tar';
import * as ProgressBar from 'progress';
import { createGunzip } from 'zlib';
import * as os from 'os';
import * as Path from 'path';
import downloadFile from '@ulixee/commons/lib/downloadFile';
import { getInstallDirectory, isBinaryInstalled, recordVersion, version } from './Utils';

if (Boolean(JSON.parse(process.env.ULX_CHROMEALIVE_SKIP_BINARY_DOWNLOAD ?? 'false')) === true) {
  process.exit(0);
}

if (isBinaryInstalled()) {
  process.exit(0);
}

(async function downloadAndExtract() {
  const platform = process.env.npm_config_platform || process.platform;

  const platformNames = {
    darwin: 'mac',
    linux: 'linux',
    win32: 'win',
  };

  let archAddon = '';
  if (platform === 'darwin' && os.arch() === 'arm64') archAddon = '-arm64';

  const tmpFile = Path.join(os.tmpdir(), 'UlixeeChromeAlive.tar.gz');

  let bar: ProgressBar;

  let lastDownloadedBytes = 0;
  await downloadFile(
    `https://github.com/ulixee/platform/releases/download/v${version}/chromealive-${version}-${platformNames[platform]}${archAddon}.tar.gz`,
    tmpFile,
    (downloadedBytes, totalBytes) => {
      if (!bar) {
        bar = new ProgressBar(' Downloading Ulixee ChromeAlive! [:bar]  :percent :etas', {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: totalBytes,
        });
      }

      bar.tick(downloadedBytes - lastDownloadedBytes);
      lastDownloadedBytes = downloadedBytes;
    },
  );

  const installDir = getInstallDirectory();
  if (!Fs.existsSync(installDir)) Fs.mkdirSync(installDir, { recursive: true });

  await new Promise(resolve => {
    Fs.createReadStream(tmpFile)
      .pipe(createGunzip())
      .pipe(
        Tar.extract({
          cwd: installDir,
        }),
      )
      .on('finish', resolve);
  });

  recordVersion();
})().catch(err => {
  console.error(err.stack);
  process.exit(1);
});
