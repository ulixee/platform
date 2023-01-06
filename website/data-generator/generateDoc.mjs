import Url from 'url';
import Path from 'path';
import { saveToWebsite } from "./lib/DocsUtils.mjs";

const matches = process.argv[2].match(/^\.\.\/(sql|hero|miner|datastore)\/docs\/(.+)$/);
const toolKey = matches[1];
const absoluteFilePath = Path.resolve(process.cwd(), process.argv[2]);

const __dirname = Path.dirname(Url.fileURLToPath(import.meta.url));
const rootDir = Path.resolve(__dirname, '../../');
const mdDocsRootPath = Path.resolve(rootDir, toolKey, 'docs');

await saveToWebsite(mdDocsRootPath, absoluteFilePath, toolKey);
