import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const { Databox, Function, FunctionContext, Schema, FunctionSchema, Observable, ConnectionToDataboxCore, Table } = cjsImport;

export { Databox, Function, FunctionContext, Schema, FunctionSchema, Observable, ConnectionToDataboxCore, Table };

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
