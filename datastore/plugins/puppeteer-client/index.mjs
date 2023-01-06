import { setupAutorunMjsHack } from '@ulixee/datastore/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  PuppeteerFunctionPlugin,
  Function,
  Crawler,
  PassthroughFunction,
  Observable,
  Schema,
} = cjsImport;

export {
  PuppeteerFunctionPlugin,
  Function,
  Crawler,
  PassthroughFunction,
  Observable,
  Schema,
};

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
