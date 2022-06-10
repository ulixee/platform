import { setupAutorunMjsHack } from '@ulixee/databox/index.mjs';
import cjsImport from './index.js';

const { Runner } = cjsImport;

export { Runner };

export default cjsImport.default;

setupAutorunMjsHack();