import Fs from 'fs';
import Path from 'path';
import Url from 'url';
import { unified } from 'unified'
import remarkParse from 'remark-parse'

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');
const websiteDir = Path.resolve(__dirname, '../');
const rawData = Fs.readFileSync(Path.join(rootDir, 'Milestones.md'), 'utf-8');
const data = unified().use(remarkParse).parse(rawData);

const milestones = {};
let activeVersion;

for (const item of data.children) {
  if (item.type === 'heading') {
    const value = item.children.map(x => x.value).join(' ');
    const match = value.match(/([0-9X.]+)[\s-]+(.+)/);
    if (!match) {
      throw new Error(`Unparsable header: ${value}`);
    }
    
    const [, version, heading] = match;
    if (milestones[version]) {
      throw new Error(`Version already exists: ${version}`);
    }
    
    milestones[version] = { heading };
    activeVersion = version;

  } else if (item.type === 'paragraph') {
    if (!milestones[activeVersion]) {
      throw new Error('No active version');
    }

    const description = [
      milestones[activeVersion].description,
      ...item.children.map(x => x.value),
    ];
    milestones[activeVersion].description = description.filter(x => x).join(' ');
  }
}

const filePath = Path.join(websiteDir, `public/data/milestones.json`);
Fs.writeFileSync(filePath, JSON.stringify(milestones, null, 2));
