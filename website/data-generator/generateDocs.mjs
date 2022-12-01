import Path from 'path';
import Url from 'url';
import { ensureIndexFile, saveToWebsite, walkDirectory } from './lib/DocsUtils.mjs';

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');

// const basePath = `${rootDir}/hero/docs`;
// await saveToWebsite(basePath, `${basePath}/main/Overview/Configuration.md`, 'hero');

{
  const mdDocsRootPath = `${rootDir}/hero/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'hero');
  });
  ensureIndexFile(mdDocsRootPath, 'hero');
}

{
  const mdDocsRootPath = `${rootDir}/databox/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'databox');
  });
  ensureIndexFile(mdDocsRootPath, 'databox');
}

{
  const mdDocsRootPath = `${rootDir}/miner/docs`;
  walkDirectory(mdDocsRootPath, async filePath => {
    await saveToWebsite(mdDocsRootPath, filePath, 'miner');
  });
  ensureIndexFile(mdDocsRootPath, 'miner');
}
