import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { Observable, Runner, Extractor } = cjsImport;

export { Observable, Runner, Extractor };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
