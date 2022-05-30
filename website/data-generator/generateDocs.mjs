import Fs from 'fs';
import Path from 'path';
import Url from 'url';
import { paramCase } from "param-case";
import MarkdownConverter from './MarkdownConverter.mjs';

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');
const websiteDir = Path.join(rootDir, 'website');

// const basePath = `${rootDir}/hero/docs`;
// await saveToWebsite(basePath, `${basePath}/main/Overview/Configuration.md`, 'hero');

{
  const basePath = `${rootDir}/hero/docs`;
  walkDirectory(basePath, async filePath => {
    await saveToWebsite(basePath, filePath, 'hero');
  });
}

{
  const basePath = `${rootDir}/databox/docs`;
  walkDirectory(basePath, async filePath => {
    await saveToWebsite(basePath, filePath, 'databox');
  });
}

{
  const basePath = `${rootDir}/server/docs`;
  walkDirectory(basePath, async filePath => {
    await saveToWebsite(basePath, filePath, 'server');
  });
}

async function saveToWebsite(basePath, filePath, toolKey) {
  const relativePath = Path.relative(basePath, filePath);
  const converter = new MarkdownConverter(filePath);
  const content = await converter.run();
  const jsonRelativePath = convertToSlugPath(relativePath.replace(/\.md$/, '')) + '.json';
  const jsonAbsolutePath = Path.join(websiteDir, `public/data/docs/${toolKey}/${jsonRelativePath}`);
  const currentDir = Path.dirname(jsonAbsolutePath);
  const data = {
    content,
    title: converter.title,
    subtitles: converter.subtitles,
  }
  Fs.mkdirSync(currentDir, { recursive: true });
  Fs.writeFileSync(jsonAbsolutePath, JSON.stringify(data, null, 2));
  console.log('SAVED: ', jsonRelativePath);
}

function walkDirectory(directory, onFileFn) {
  const fileNames = Fs.readdirSync(directory);
  for (const fileName of fileNames) {
    const filePath = `${directory}/${fileName}`;
    const isDirectory = Fs.statSync(filePath).isDirectory();
    if (isDirectory) {
      process.nextTick(() => {
        walkDirectory(filePath, onFileFn);
      });
    } else if (fileName.match(/\.md$/)) {
      onFileFn(filePath)
    }
  }
}

function convertToSlugPath(path) {
  return path.split('/').map(x => paramCase(x)).join('/');
}