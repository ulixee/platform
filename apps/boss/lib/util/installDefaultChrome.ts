import { latestBrowserEngineId } from '@ulixee/default-browser-emulator';

let hasUnpackedChrome = false;
export async function installDefaultChrome(): Promise<void> {
  if (hasUnpackedChrome) return;
  try {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    let LatestChrome = require(`@ulixee/${latestBrowserEngineId}`);
    if (LatestChrome.default) LatestChrome = LatestChrome.default;
    const chromeApp = new LatestChrome();
    if (chromeApp.isInstalled) {
      hasUnpackedChrome = true;
      return;
    }
    await chromeApp.install();
    hasUnpackedChrome = true;
  } catch (err) {
    console.error('ERROR trying to install latest browser', err);
  }
}
