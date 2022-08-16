import Databox from '@ulixee/databox';

export default new Databox(databox => {
  databox.output = { success: true, input: databox.input };
});
