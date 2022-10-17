import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { Observable, DataboxObject } = cjsImport;

export { Observable, DataboxObject };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);