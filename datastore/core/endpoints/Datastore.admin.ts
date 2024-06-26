import Identity from '@ulixee/platform-utils/lib/Identity';
import { InvalidSignatureError } from '@ulixee/platform-utils/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/platform-specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { InvalidPermissionsError } from '../lib/errors';

export default new DatastoreApiHandler('Datastore.admin', {
  async handler(request, context): Promise<IDatastoreApiTypes['Datastore.admin']['result']> {
    const { adminSignature, adminIdentity, adminFunction, functionArgs } = request;

    const datastoreVersion = await context.datastoreRegistry.get(
      request.id,
      request.version,
    );

    const approvedAdmins = new Set<string>([
      ...datastoreVersion.adminIdentities,
      ...context.configuration.cloudAdminIdentities,
    ]);

    if (!adminIdentity || !approvedAdmins.has(adminIdentity)) {
      throw new InvalidPermissionsError(
        `Your Identity is not approved to administer this Datastore.`,
      );
    }
    const { ownerType, ownerName, functionName } = adminFunction;

    const message = DatastoreApiClient.createAdminFunctionMessage(
      request.id,
      adminIdentity,
      ownerType,
      ownerName,
      functionName,
      functionArgs,
    );

    if (!Identity.verify(adminIdentity, message, adminSignature)) {
      throw new InvalidSignatureError('Your Admin signature is invalid for this function call.');
    }

    const storage = context.storageEngineRegistry.get(datastoreVersion, {
      id: request.id,
      version: request.version,
      queryId: context.connectionToClient?.transport.remoteId ?? 'admin',
    });
    const datastore = await context.vm.open(
      datastoreVersion.runtimePath,
      storage,
      datastoreVersion,
    );

    if (adminFunction.ownerType === 'datastore') {
      if (typeof datastore[functionName] !== 'function')
        throw new Error(`An admin function called ${functionName} could not be found`);
      return datastore[functionName](...functionArgs);
    }

    const ownerCollection = `${adminFunction.ownerType}s`;
    const owner = datastore[ownerCollection][ownerName];
    if (!owner) {
      throw new Error(
        `The ${adminFunction.ownerType} ${ownerCollection}.${ownerName} could not be found in this Datastore.`,
      );
    }
    if (typeof owner[functionName] !== 'function')
      throw new Error(
        `An admin function on ${ownerCollection}.${ownerName} called ${functionName} could not be found`,
      );
    return await owner[functionName](...functionArgs);
  },
});
