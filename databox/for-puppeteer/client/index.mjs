import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { RunnerObject } = cjsImport;

export { RunnerObject };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);