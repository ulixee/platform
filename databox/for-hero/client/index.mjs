import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  HeroFunctionPlugin,
  Observable,
  Databox,
  Function,
  Schema,
} = cjsImport;

export {
  HeroFunctionPlugin,
  Observable,
  Databox,
  Function,
  Schema,
};

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
