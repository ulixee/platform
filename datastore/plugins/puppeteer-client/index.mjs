import { setupAutorunMjsHack } from '@ulixee/datastore/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  PuppeteerFunctionPlugin,
  Observable,
  Datastore,
  Function,
  Crawler,
  PassthroughFunction,
  Schema,
} = cjsImport;

export {
  PuppeteerFunctionPlugin,
  Observable,
  Datastore,
  Function,
  Crawler,
  PassthroughFunction,
  Schema,
};

setupAutorunMjsHack();
