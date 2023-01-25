// NOTE: you must start your own Ulixee Server to run this example.
import * as HeroPlugin from  '@ulixee/datastore-plugins-hero';
import { Function, HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';

export default new Function(datastore => {
  console.log('INPUT: ', datastore.input);
}, HeroFunctionPlugin);
