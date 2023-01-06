import { setupAutorunMjsHack } from './lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  Databox,
  ExtractorFunction,
  CrawlerFunction,
  PassthroughFunction,
  FunctionContext,
  Schema,
  FunctionSchema,
  Observable,
  ConnectionToDataboxCore,
  Table,
} = cjsImport;

export {
  Databox,
  ExtractorFunction,
  Crawler,
  PassthroughFunction,
  FunctionContext,
  Schema,
  FunctionSchema,
  Observable,
  ConnectionToDataboxCore,
  Table,
};

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
