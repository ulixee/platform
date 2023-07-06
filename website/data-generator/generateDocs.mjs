import Path from 'path';
import Url from 'url';
import { ensureIndexFile, saveToWebsite, walkDirectory } from './lib/DocsUtils.mjs';

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');

// const basePath = `${rootDir}/hero/docs`;
// await saveToWebsite(basePath, `${basePath}/main/Overview/Configuration.md`, 'hero');

{
  const mdDocsRootPath = `${rootDir}/client/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'client');
  }).then(() => ensureIndexFile(mdDocsRootPath, 'client'));
}

{
  const mdDocsRootPath = `${rootDir}/hero/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'hero');
  }).then(() => ensureIndexFile(mdDocsRootPath, 'hero'));
}

{
  const mdDocsRootPath = `${rootDir}/datastore/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'datastore');
  }).then(() => ensureIndexFile(mdDocsRootPath, 'datastore'));
}

{
  const mdDocsRootPath = `${rootDir}/sql/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'sql');
  }).then(() => ensureIndexFile(mdDocsRootPath, 'sql'));
}

{
  const mdDocsRootPath = `${rootDir}/cloud/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'cloud');
  }).then(() => ensureIndexFile(mdDocsRootPath, 'cloud'));
}
