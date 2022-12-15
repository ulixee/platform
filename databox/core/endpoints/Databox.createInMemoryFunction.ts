import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxStorage from '../lib/DataboxStorage';

export default new DataboxApiHandler('Databox.createInMemoryFunction', {
  handler(request, context) {
    if (!context.connectionToClient?.isInternal) {
      throw new Error('You do not have permission to access this endpoint');
    }
    context.connectionToClient.databoxStorage ??= new DataboxStorage();
    const storage = context.connectionToClient?.databoxStorage;
    storage.addFunctionSchema(request.name, request.schema);
    return Promise.resolve({});
  },
});

