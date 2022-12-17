import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import Databox, { Function } from '@ulixee/databox';
import { IPayment } from '@ulixee/specification';
import Identity from '@ulixee/crypto/lib/Identity';
import DataboxApiClient, { IDataboxExecRelayArgs } from '@ulixee/databox/lib/DataboxApiClient';
import DataboxCore from '../index';
import IDataboxApiContext from '../interfaces/IDataboxApiContext';
import { IDataboxRecord } from './DataboxesTable';
import { IStatsByFunctionName } from './DataboxRegistry';

export function validateFunctionCoreVersions(
  registryEntry: IDataboxRecord & {
    statsByFunction: IStatsByFunctionName;
    path: string;
    latestVersionHash: string;
  },
  functionName: string,
  context: IDataboxApiContext,
): void {
  if (!registryEntry.functionsByName[functionName])
    throw new Error(`${functionName} is not a valid function name for this Databox`);

  const { corePlugins } = registryEntry.functionsByName[functionName] ?? {};
  for (const [pluginName, pluginVersion] of Object.entries(corePlugins ?? {})) {
    const pluginCore = context.pluginCoresByName[pluginName];
    if (!pluginCore) {
      throw new Error(`Miner does not support required runtime dependency: ${pluginName}`);
    }

    if (!isSemverSatisfied(pluginVersion, pluginCore.version)) {
      throw new Error(
        `The current version of ${pluginName} (${pluginVersion}) is incompatible with this Databox version (${pluginVersion})`,
      );
    }
  }
}

export async function validateAuthentication(
  databox: Databox<any, any>,
  payment: IPayment,
  authentication: IDataboxApiTypes['Databox.query']['args']['authentication'],
): Promise<void> {
  if (!databox.authenticateIdentity) return;

  const isValid = await databox.authenticateIdentity(
    authentication?.identity,
    authentication?.nonce,
  );
  if (isValid !== true)
    throw new Error(
      `The supplied authentication was rejected by this Databox. ${
        JSON.stringify(authentication) ?? '(nothing supplied)'
      }`,
    );

  // if callback didn't reject lack of identity, allow it
  if (isValid && !authentication) return;

  const { nonce, identity, signature } = authentication;
  const message = DataboxApiClient.createExecSignatureMessage(payment, nonce);
  if (!Identity.verify(identity, message, signature)) {
    throw new Error('The provided Databox.query authentication signature is invalid.');
  }
}

export async function execDataboxFunction(
  databox: Databox<any, any>,
  manifest: IDataboxManifest,
  functionName: string,
  input: any,
  requestRelayArgs: IDataboxExecRelayArgs,
): Promise<{ outputs: any[] }> {
  const databoxFunction: Function = databox.functions?.[functionName];

  if (!databoxFunction) {
    throw new Error(`${functionName} is not a valid Function name for this Databox.`);
  }

  const options = { input, ...(requestRelayArgs ?? {}) };
  for (const plugin of Object.values(DataboxCore.pluginCoresByName)) {
    if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
  }

  const outputs = await databoxFunction.exec(options);
  return { outputs };
}
