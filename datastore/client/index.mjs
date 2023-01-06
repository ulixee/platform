import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  Datastore,
  ExtractorFunction,
  CrawlerFunction,
  PassthroughFunction,
  FunctionContext,
  Schema,
  FunctionSchema,
  Observable,
  ConnectionToDatastoreCore,
  Table,
} = cjsImport;

export {
  Datastore,
  ExtractorFunction,
  Crawler,
  PassthroughFunction,
  FunctionContext,
  Schema,
  FunctionSchema,
  Observable,
  ConnectionToDatastoreCore,
  Table,
};

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
