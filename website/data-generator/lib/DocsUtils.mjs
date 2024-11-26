import Fs from 'fs';
import Path from 'path';
import Url from 'url';
import { paramCase } from 'param-case';
import MarkdownConverter from './MarkdownConverter.mjs';

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../../');
const websiteDir = Path.join(rootDir, 'website');

export function ensureIndexFile(originalBasePath, toolKey, relativeWebsiteDir) {
  relativeWebsiteDir = relativeWebsiteDir ? `${toolKey}/${relativeWebsiteDir}` : toolKey;
  const copyFromPath = Path.join(
    websiteDir,
    `public/data/docs/${relativeWebsiteDir}/overview/introduction.json`,
  );
  const copyToPath = Path.join(websiteDir, `public/data/docs/${relativeWebsiteDir}/index.json`);
  console.log(`Ensuring index.json for ${toolKey} at ${copyToPath}`);
  if (!Fs.existsSync(copyFromPath)) return;
  Fs.copyFileSync(copyFromPath, copyToPath);
}

export async function saveToWebsite(mdDocsRootPath, absoluteFilePath, toolKey) {
  const relativePath = Path.relative(mdDocsRootPath, absoluteFilePath);
  if (absoluteFilePath.match(/\.png$/) || absoluteFilePath.match(/\.jpg$/)) {
    if (!Fs.existsSync(Path.join(websiteDir, `public/docs/${toolKey}/images`))) {
      Fs.mkdirSync(Path.join(websiteDir, `public/docs/${toolKey}/images`), { recursive: true });
    }
    Fs.copyFileSync(
      absoluteFilePath,
      Path.join(websiteDir, `public/docs/${toolKey}/images`, Path.basename(absoluteFilePath)),
    );
    console.log(`SAVED ${toolKey}/images/${Path.basename(absoluteFilePath)}`);
    return;
  }
  const converter = new MarkdownConverter(
    absoluteFilePath,
    '/docs/' + toolKey + '/' + relativePath,
  );
  const content = await converter.run();
  const jsonRelativePath = convertToSlugPath(relativePath.replace(/\.md$/, '')) + '.json';
  const jsonAbsolutePath = Path.join(websiteDir, `public/data/docs/${toolKey}/${jsonRelativePath}`);
  const currentDir = Path.dirname(jsonAbsolutePath);
  const data = {
    content,
    title: converter.title,
    subtitles: converter.subtitles,
  };
  Fs.mkdirSync(currentDir, { recursive: true });
  Fs.writeFileSync(jsonAbsolutePath, JSON.stringify(data, null, 2));
  console.log(`SAVED ${toolKey}/${jsonRelativePath}`);
}

export async function walkDirectory(directory, onFileFn) {
  const fileNames = Fs.readdirSync(directory);
  for (const fileName of fileNames) {
    const filePath = `${directory}/${fileName}`;
    const isDirectory = Fs.statSync(filePath).isDirectory();
    if (isDirectory) {
      await new Promise(resolve => {
        process.nextTick(async () => {
          await walkDirectory(filePath, onFileFn);
          resolve();
        });
      });
    } else if (fileName.match(/\.md$/) || fileName.match(/\.png$/) || fileName.match(/\.jpg$/)) {
      await onFileFn(filePath);
    }
  }
}

export function convertToSlugPath(path) {
  return path
    .split('/')
    .map(x => paramCase(x))
    .join('/');
}
