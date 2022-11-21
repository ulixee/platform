import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { Databox, Function, FunctionContext, Schema, FunctionSchema } = cjsImport;

export { Function, FunctionContext, Schema, FunctionSchema, Databox, Observable };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
