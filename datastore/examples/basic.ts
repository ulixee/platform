// NOTE: you must start your own Ulixee Miner to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';

export default new Function(datastore => {
  console.log('INPUT: ', datastore.input);
}, HeroFunctionPlugin);
