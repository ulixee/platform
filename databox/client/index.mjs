import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { DataboxObject, Schema } = cjsImport;

export { DataboxObject, Schema, Databox, Observable };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
