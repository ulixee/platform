import { DataboxObject as DataboxObjectBase } from "@ulixee/databox";
import Hero, { HeroReplay } from "@ulixee/hero";

export default interface IDataboxObject<TInput, TOutput> extends DataboxObjectBase<TInput, TOutput> {
  hero: Hero;
  sessionId: Promise<string>;
}

export interface IDataboxObjectForReplay<TInput, TOutput> extends DataboxObjectBase<TInput, TOutput> {
  heroReplay: HeroReplay;
  sessionId: Promise<string>;
}