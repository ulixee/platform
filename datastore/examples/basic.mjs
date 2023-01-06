// NOTE: you must start your own Ulixee Server to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/datastore-for-hero';

export default new Function(datastore => {
  console.log('INPUT: ', datastore.input);
}, HeroFunctionPlugin);
