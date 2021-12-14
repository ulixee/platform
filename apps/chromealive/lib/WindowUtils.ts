import { BrowserWindow } from "electron";

export default async function injectCoreServer(window: BrowserWindow, coreServerAddress: string): Promise<void> {
  await window.webContents.executeJavaScript(
    `(() => {
    const coreServerAddress = '${coreServerAddress ?? ''}';
    if (coreServerAddress) {
      window.heroServerUrl = coreServerAddress;
      if ('setHeroServerUrl' in window) window.setHeroServerUrl(coreServerAddress);
    }
})()`,
  );
}
