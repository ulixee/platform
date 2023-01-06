import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  HeroFunctionPlugin,
  Observable,
  Databox,
  Function,
  Crawler,
  PassthroughFunction,
  Schema,
} = cjsImport;

export {
  HeroFunctionPlugin,
  Observable,
  Databox,
  Function,
  Crawler,
  PassthroughFunction,
  Schema,
};

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
