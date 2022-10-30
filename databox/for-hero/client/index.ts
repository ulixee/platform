import '@ulixee/commons/lib/SourceMapSupport';
import IHeroCreateOptions from '@ulixee/hero/interfaces/IHeroCreateOptions';
import DataboxForHeroPlugin from './lib/DataboxForHeroPlugin';
import DataboxForHero from './lib/DataboxForHero';

export * from '@ulixee/databox';
export { DataboxForHero, DataboxForHeroPlugin, IHeroCreateOptions };

export default DataboxForHero;
