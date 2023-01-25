import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  Table,
  Datastore,
  Observable,
  FunctionSchema,
  FunctionContext,
  Function,
  Crawler,
  ConnectionToDatastoreCore,
  PassthroughFunction,
  Schema,
} = cjsImport;

export {
  Table,
  Datastore,
  Observable,
  FunctionSchema,
  FunctionContext,
  Function,
  Crawler,
  ConnectionToDatastoreCore,
  PassthroughFunction,
  Schema,
};

export default cjsImport.default;

setupAutorunMjsHack();
