import { setupAutorunMjsHack } from '@ulixee/datastore/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  HeroFunctionPlugin,
  Observable,
  Datastore,
  Function,
  Crawler,
  PassthroughFunction,
  Schema,
} = cjsImport;

export {
  HeroFunctionPlugin,
  Observable,
  Datastore,
  Function,
  Crawler,
  PassthroughFunction,
  Schema,
};

setupAutorunMjsHack();
