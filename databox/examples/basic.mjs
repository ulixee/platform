// NOTE: you must start your own Ulixee Server to run this example.

import { Function, HeroFunctionPlugin } from '@ulixee/databox-for-hero';

export default new Function(databox => {
  console.log('INPUT: ', databox.input);
}, HeroFunctionPlugin);
