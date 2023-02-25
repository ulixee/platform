import { notarize } from '@electron/notarize';

export default async function notarizing(context): Promise<void> {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin' || process.env.SKIP_NOTARIZE) {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'dev.ulixee.desktop',
    appPath: `${appOutDir}/${appName}.app`,
    appleApiKey: '5VH6PQ3585',
    appleApiKeyId: '5VH6PQ3585',
    appleApiIssuer: 'a89474ed-637f-4cf0-8429-da45ef388882',
    teamId: 'DY8K483XWV',
  });
}
