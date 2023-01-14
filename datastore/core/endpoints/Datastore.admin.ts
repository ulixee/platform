import Identity from '@ulixee/crypto/lib/Identity';
import { InvalidSignatureError } from '@ulixee/crypto/lib/errors';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import DatastoreApiHandler from '../lib/DatastoreApiHandler';
import { InvalidPermissionsError } from '../lib/errors';
import DatastoreVm from '../lib/DatastoreVm';

export default new DatastoreApiHandler('Datastore.admin', {
  async handler(request, context): Promise<IDatastoreApiTypes['Datastore.admin']['result']> {
    const { adminSignature, adminIdentity, adminFunction, functionArgs } = request;

    const { registryEntry, manifest } = await context.datastoreRegistry.loadVersion(
      request.versionHash,
    );

    const approvedAdmins = new Set<string>([
      ...manifest.adminIdentities,
      ...context.configuration.serverAdminIdentities,
    ]);

    if (!adminIdentity || !approvedAdmins.has(adminIdentity)) {
      throw new InvalidPermissionsError(
        `Your Identity is not approved to administer this Datastore.`,
      );
    }
    const { ownerType, ownerName, functionName } = adminFunction;

    const message = DatastoreApiClient.createAdminFunctionMessage(
      adminIdentity,
      ownerType,
      ownerName,
      functionName,
      functionArgs,
    );

    if (!Identity.verify(adminIdentity, message, adminSignature)) {
      throw new InvalidSignatureError('Your Admin signature is invalid for this function call.');
    }

    const datastore = await DatastoreVm.open(registryEntry.path, manifest);

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
