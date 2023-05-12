import Fs from 'fs';
import Path from 'path';
import Url from 'url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

const UNVERSIONED = 'UNVERSIONED';
const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');
const websiteDir = Path.resolve(__dirname, '../');

const milestonesPath = `${websiteDir}/public/data/milestones.json`;
const rawMilestones = Fs.readFileSync(milestonesPath, 'utf-8');
const milestones = JSON.parse(rawMilestones);

const roadmapPaths = [
  'cloud/ROADMAP-Cloud.md',
  'stream/ROADMAP-Stream.md',
  'hero/ROADMAP-Hero.md',
  'datastore/ROADMAP-Datastore.md',
  '../payments/ROADMAP-Argon.md',
  '../payments/mainchain/ROADMAP-Mainchain.md',
  '../payments/sidechain/ROADMAP-Sidechain.md',
  '../unblocked/ROADMAP-DoubleAgent.md',
  '../unblocked/ROADMAP-ScraperReport.md',
  'coming-soon/ROADMAP-Pipeline.md',
  'coming-soon/ROADMAP-Domain.md',
  'coming-soon/ROADMAP-Manager.md',
  'coming-soon/ROADMAP-Marketplace.md',
  'coming-soon/ROADMAP-NFTs.md',
  'desktop/ROADMAP-Desktop.md',
];

for (const roadmapPath of roadmapPaths) {
  const toolName = roadmapPath.match(/([^-]+)\.md$/)[1];
  console.log(toolName, '...');
  if (!Fs.existsSync(`${rootDir}/${roadmapPath}`)) {
    console.warn(`WARN: ${rootDir}/${roadmapPath} doesn't exist!!`);
    continue;
  }
  const rawData = Fs.readFileSync(`${rootDir}/${roadmapPath}`, 'utf-8');
  const data = unified().use(remarkParse).parse(rawData);

  const intro = [];
  const minorReleases = {};
  const unversionedFeatures = {};
  let activeVersion = null;
  let unversionedHeader;

  for (const item of data.children) {
    if (item.type === 'heading' && activeVersion === UNVERSIONED) {
      const heading = item.children.map(x => x.value).join(' ');

      if (unversionedFeatures[heading]) {
        throw new Error(`Unversioned header already exists: ${heading}`);
      }

      unversionedFeatures[heading] = { heading };
      unversionedHeader = heading;
    } else if (item.type === 'heading') {
      const value = item.children.map(x => x.value).join(' ');
      if (value === UNVERSIONED) {
        activeVersion = value;
        continue;
      }
      const match = value.trim().match(/^([0-9X.]+)[\s-]*(.*)$/);
      if (!match) {
        throw new Error(`Unparsable header (${roadmapPath}): ${value}`);
      }

      const [, version, heading] = match;
      if (minorReleases[version]) {
        throw new Error(`Version already exists (${roadmapPath}): ${version}`);
      }

      minorReleases[version] = { heading, version };
      activeVersion = version;
    } else if (item.type === 'paragraph') {
      const paragraphs = [...item.children.map(x => x.value)];

      if (activeVersion === UNVERSIONED) {
        paragraphs.unshift(unversionedFeatures[unversionedHeader].description);
        unversionedFeatures[unversionedHeader].description = paragraphs.filter(x => x).join(' ');
      } else if (activeVersion) {
        paragraphs.unshift(minorReleases[activeVersion].description);
        minorReleases[activeVersion].description = paragraphs.filter(x => x).join(' ');
      } else {
        intro.push(paragraphs.filter(x => x).join(' '));
      }
    } else if (item.type === 'list') {
      const items = [];
      for (const child of item.children) {
        items.push(child.children[0].children[0].value.split('\n'));
      }
      if (activeVersion === UNVERSIONED) {
        unversionedFeatures[unversionedHeader].items = items;
      } else if (activeVersion) {
        minorReleases[activeVersion].items = items;
      }
    }
  }

  for (const key of Object.keys(minorReleases)) {
    milestones[key].tools = milestones[key].tools || [];
    milestones[key].tools.push({ name: toolName });
  }

  const filePath = Path.join(websiteDir, `public/data/roadmaps/${toolName}.json`);
  const fileData = {
    intro,
    minorReleases,
    unversionedFeatures,
  };
  Fs.mkdirSync(Path.dirname(filePath), { recursive: true });
  Fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));

  Fs.mkdirSync(Path.dirname(milestonesPath), { recursive: true });
  Fs.writeFileSync(milestonesPath, JSON.stringify(milestones, null, 2));
}
