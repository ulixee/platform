// NOTE: you must start your own Ulixee Server to run this example.
import * as HeroPlugin from  '@ulixee/datastore-plugins-hero';
import { Runner, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Runner(datastore => {
  console.log('INPUT: ', datastore.input);
}, HeroRunnerPlugin);
