import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { DataboxObject, DataboxForPuppeteer, DataboxForPuppeteerPlugin, Observable, Schema } = cjsImport;

export { DataboxObject, DataboxForPuppeteer, DataboxForPuppeteerPlugin, Observable, Schema };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
