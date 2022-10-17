import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { DataboxObject } = cjsImport;

export { DataboxObject };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);