// NOTE: you must start your own Ulixee Miner to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(databox => {
  console.log('INPUT: ', databox.input);
}, HeroFunctionPlugin);
