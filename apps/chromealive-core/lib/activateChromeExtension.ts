import Debug from 'debug';
import type Puppet from '@ulixee/hero-puppet';
import Log from '@ulixee/commons/lib/Logger';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';

const { log } = Log(module);

const debug = Debug('ulixee:chromealive');
// extension id is fixed by the "key" in the manifest
const extensionId = 'nhchohpofcdodgoddejmfcebjkmdafmk';

const enabledBrowsersById = new Map<string, Promise<void>>();

export function waitForChromeExtension(browserId: string): Promise<void> {
  return enabledBrowsersById.get(browserId);
}

export default function activateChromeExtension(puppet: Puppet): Promise<void> {
  if (!enabledBrowsersById.has(puppet.browserId)) {
    enabledBrowsersById.set(puppet.browserId, toggleIncognitoAccess(puppet));
  }
  return enabledBrowsersById.get(puppet.browserId);
}

async function toggleIncognitoAccess(puppet: Puppet): Promise<void> {
  debug('Installing incognito access for ChromeAlive extension');
  let context: IPuppetContext;
  try {
    context = await puppet.newContext({} as any, log as IBoundLog);

    const page = await context.newPage({ runPageScripts: false });
    const loader = await page.navigate(`chrome://extensions?id=${extensionId}`);
    await page.mainFrame.waitForLoader(loader.loaderId);
    await page.mainFrame.waitForLoad();

    // https://stackoverflow.com/questions/27534688/enabling-chrome-extension-in-incognito-mode-via-cli-flags
    await page.mainFrame.evaluate(
      `chrome.developerPrivate.updateExtensionConfiguration({extensionId: "${extensionId}",incognitoAccess: true})`,
      false,
    );
  } catch (error) {
    console.log(
      `Failed to enable chrome extension in incognito!!\n\nYou can enable by navigating to the page below and checking "Enable in Incognito":\n
chrome://extensions?id=${extensionId}\n\n`,
      error,
    );
  } finally {
    await context.close();
  }
}
