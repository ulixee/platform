import { setupAutorunMjsHack } from '@ulixee/datastore/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  HeroRunnerPlugin,
  Observable,
  Datastore,
  Runner,
  Crawler,
  PassthroughRunner,
  Schema,
} = cjsImport;

export {
  HeroRunnerPlugin,
  Observable,
  Datastore,
  Runner,
  Crawler,
  PassthroughRunner,
  Schema,
};

setupAutorunMjsHack();
