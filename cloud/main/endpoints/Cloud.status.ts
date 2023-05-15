import CloudApiHandler from '../lib/CloudApiHandler';

export default new CloudApiHandler('Cloud.status', {
  handler(request, context) {
    const cloudNodes = context.nodeTracker.count;

    return Promise.resolve({ nodes: cloudNodes, version: context.version });
  },
});
