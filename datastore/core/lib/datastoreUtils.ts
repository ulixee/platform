import { IDatastoreApiTypes } from '@ulixee/specification/datastore';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import Datastore from '@ulixee/datastore';
import { IPayment } from '@ulixee/specification';
import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreApiClient from '@ulixee/datastore/lib/DatastoreApiClient';
import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';
import IDatastoreApiContext from '../interfaces/IDatastoreApiContext';
import { IStatsByFunctionName } from './DatastoreRegistry';

export function validateFunctionCoreVersions(
  registryEntry: IDatastoreManifest & {
    statsByFunction: IStatsByFunctionName;
    path: string;
    latestVersionHash: string;
  },
  functionName: string,
  context: IDatastoreApiContext,
): void {
  if (!registryEntry.functionsByName[functionName])
    throw new Error(`${functionName} is not a valid function name for this Datastore`);

  const { corePlugins } = registryEntry.functionsByName[functionName] ?? {};
  for (const [pluginName, pluginVersion] of Object.entries(corePlugins ?? {})) {
    const pluginCore = context.pluginCoresByName[pluginName];
    if (!pluginCore) {
      throw new Error(`Miner does not support required runtime dependency: ${pluginName}`);
    }

    if (!isSemverSatisfied(pluginVersion, pluginCore.version)) {
      throw new Error(
        `The current version of ${pluginName} (${pluginVersion}) is incompatible with this Datastore version (${pluginVersion})`,
      );
    }
  }
}

export async function validateAuthentication(
  datastore: Datastore,
  payment: IPayment,
  authentication: IDatastoreApiTypes['Datastore.query']['args']['authentication'],
): Promise<void> {
  if (!datastore.authenticateIdentity) return;

  const isValid = await datastore.authenticateIdentity(
    authentication?.identity,
    authentication?.nonce,
  );
  if (isValid !== true)
    throw new Error(
      `The supplied authentication was rejected by this Datastore. ${
        JSON.stringify(authentication) ?? '(nothing supplied)'
      }`,
    );

  // if callback didn't reject lack of identity, allow it
  if (isValid && !authentication) return;

  const { nonce, identity, signature } = authentication;
  const message = DatastoreApiClient.createExecSignatureMessage(payment, nonce);
  if (!Identity.verify(identity, message, signature)) {
    throw new Error('The provided Datastore.query authentication signature is invalid.');
  }
}
