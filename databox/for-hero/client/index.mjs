import { setupAutorunMjsHack } from '@ulixee/databox/lib/utils/Autorun.mjs';
import cjsImport from './index.js';

const {
  DataboxForHero,
  DataboxForHeroPlugin,
  Observable,
  IHeroCreateOptions,
  DataboxObject,
  Schema,
} = cjsImport;

export {
  DataboxForHero,
  DataboxForHeroPlugin,
  Observable,
  IHeroCreateOptions,
  DataboxObject,
  Schema,
};

export default cjsImport.default;

setupAutorunMjsHack(cjsImport.default);
