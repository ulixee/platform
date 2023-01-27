// NOTE: you must start your own Ulixee Miner to run this example.

import { Runner, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Runner(datastore => {
  console.log('INPUT: ', datastore.input);
}, HeroRunnerPlugin);
