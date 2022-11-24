import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxInMemoryStorage from '../lib/DataboxInMemoryStorage';

export default new DataboxApiHandler('Databox.createInMemoryFunction', {
  handler(request) {
    const storage = new DataboxInMemoryStorage(request.databoxInstanceId);
    storage.addFunctionSchema(request.name, request.schema);
    return Promise.resolve({});
  },
});

