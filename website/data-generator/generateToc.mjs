import Fs from 'fs';
import Path from 'path';
import Url from 'url';
import JsYaml from 'js-yaml';

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');
const websiteDir = Path.join(rootDir, 'website');
const tocDataDir = Path.join(websiteDir, 'public/data/toc');
Fs.mkdirSync(tocDataDir, { recursive: true });

{
  const yamlLinks = Fs.readFileSync(`${rootDir}/hero/docs/links.yaml`, 'utf-8');
  const links = JsYaml.load(yamlLinks);
  const saveToFilePath = Path.join(tocDataDir, `hero.json`);
  Fs.writeFileSync(saveToFilePath, JSON.stringify(links, null, 2));
}

{
  const yamlLinks = Fs.readFileSync(`${rootDir}/databox/docs/links.yaml`, 'utf-8');
  const links = JsYaml.load(yamlLinks);
  const saveToFilePath = Path.join(tocDataDir, `databox.json`);
  Fs.writeFileSync(saveToFilePath, JSON.stringify(links, null, 2));
}

{
  const yamlLinks = Fs.readFileSync(`${rootDir}/miner/docs/links.yaml`, 'utf-8');
  const links = JsYaml.load(yamlLinks);
  const saveToFilePath = Path.join(tocDataDir, `miner.json`);
  Fs.writeFileSync(saveToFilePath, JSON.stringify(links, null, 2));
}
