import '@ulixee/commons/lib/SourceMapSupport';
import IHeroCreateOptions from '@ulixee/hero/interfaces/IHeroCreateOptions';
import DataboxObject from '@ulixee/databox/lib/DataboxObject'; 
import { Observable } from './lib/ObjectObserver';
import DataboxForHeroPlugin from './lib/DataboxForHeroPlugin';
import DataboxForHero from './lib/DataboxForHero';

export { 
  DataboxForHero,
  DataboxForHeroPlugin, 
  Observable, 
  IHeroCreateOptions, 
  DataboxObject,
};

export default DataboxForHero;
