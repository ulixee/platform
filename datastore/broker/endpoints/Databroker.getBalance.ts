import DatabrokerApiHandler from '../lib/DatabrokerApiHandler';

export default new DatabrokerApiHandler('Databroker.getBalance', {
  async handler(request, context) {
    const organizationId = context.db.users.getOrganizationId(request.identity);
    if (!organizationId) throw new Error('User not found');
    const balance = context.db.organizations.get(organizationId).balance;
    return { balance };
  },
});
