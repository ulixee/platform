// NOTE: you must start your own Ulixee Server to run this example.

import Databox from '@ulixee/databox-for-hero';

export default new Databox(databox => {
  console.log('INPUT: ', databox.input);
});
