import '@ulixee/commons/lib/SourceMapSupport';
import Core from '@ulixee/hero-core';
import DefaultHero, { IHeroCreateOptions } from '@ulixee/hero';
export * from '@ulixee/hero';
export { Core };
export default class Hero extends DefaultHero {
    constructor(createOptions?: IHeroCreateOptions);
}
