import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { Observable, RunnerObject } = cjsImport;

export { Observable, RunnerObject };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);