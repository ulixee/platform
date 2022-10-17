import '@ulixee/commons/lib/SourceMapSupport';
import IHeroCreateOptions from '@ulixee/hero/interfaces/IHeroCreateOptions';
import RunnerObject from '@ulixee/databox/lib/RunnerObject'; 
import { Observable } from './lib/ObjectObserver';
import DataboxForHeroPlugin from './lib/DataboxForHeroPlugin';
import DataboxForHero from './lib/DataboxForHero';

export { 
  DataboxForHero,
  DataboxForHeroPlugin, 
  Observable, 
  IHeroCreateOptions, 
  RunnerObject,
};

export default DataboxForHero;
