import { setupAutorunMjsHack } from '@ulixee/datastore/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  PuppeteerRunnerPlugin,
  Observable,
  Datastore,
  Runner,
  Crawler,
  PassthroughRunner,
  Schema,
} = cjsImport;

export {
  PuppeteerRunnerPlugin,
  Observable,
  Datastore,
  Runner,
  Crawler,
  PassthroughRunner,
  Schema,
};

setupAutorunMjsHack();
