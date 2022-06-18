import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { Observable, RunnerObject, ExtractorObject } = cjsImport;

export { Observable, RunnerObject, ExtractorObject };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);