import { promises as Fs } from 'fs';
import { NodeVM, VMScript } from 'vm2';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import { existsAsync } from '@ulixee/commons/lib/fileUtils';
import IDataboxManifest from '@ulixee/specification/types/IDataboxManifest';
import { IDataboxApiTypes } from '@ulixee/specification/databox';
import { isSemverSatisfied } from '@ulixee/commons/lib/VersionUtils';
import Databox, { Function, ConnectionToDataboxCore } from '@ulixee/databox';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import { SqlParser } from '@ulixee/sql-engine';
import SqlQuery from '../lib/SqlQuery';
import DataboxApiHandler from '../lib/DataboxApiHandler';
import DataboxCore from '../index';
import PaymentProcessor from '../lib/PaymentProcessor';
import IDataboxApiContext from '../interfaces/IDataboxApiContext';
import { IDataboxRecord } from '../lib/DataboxesTable';
import { InvalidMicronoteError, MicronotePaymentRequiredError } from '../lib/errors';
import { IDataboxStatsRecord } from '../lib/DataboxStatsTable';
import DataboxStorage from '../lib/DataboxStorage';

const giftCardIssuersById: { [giftCardId: string]: string[] } = {};
const { version } = require('../package.json');

export default new DataboxApiHandler('Databox.query', {
  async handler(request, context) {
    if (DataboxCore.isClosing) {
      throw new CanceledPromiseError('Miner shutting down. Not accepting new work.');
    }
    await DataboxCore.start();
    request.boundValues ??= [];

    let totalMicrogons = 0;
    const startTime = Date.now();    
    const registryEntry = context.databoxRegistry.getByVersionHash(request.versionHash);
    const { coreVersion } = registryEntry;
    if (!isSemverSatisfied(coreVersion, version)) {
      throw new Error(
        `The current version of Core (${version}) is incompatible with this Databox version (${coreVersion})`,
      );
    }

    const manifest: IDataboxManifest = {
      ...registryEntry,
      linkedVersions: [],
    };

    if (!(await existsAsync(registryEntry.path))) {
      await context.databoxRegistry.openDbx(manifest);
    }

    let storage: DataboxStorage;
    if (request.versionHash) {
      const storagePath = context.databoxRegistry.getStoragePath(request.versionHash);
      storage = new DataboxStorage(storagePath);
    } else {
      context.connectionToClient.databoxStorage ??= new DataboxStorage();
      storage = context.connectionToClient?.databoxStorage;
    }

    const db = storage.db;
    const databox = await openDatabox(registryEntry.path, manifest);
    const sqlParser = new SqlParser(request.sql);
    if (!sqlParser.isSelect()) throw new Error('Invalid SQL command');
    
    sqlParser.functionNames.forEach(functionName => {
      const schema = databox.functions[functionName].schema || {};
      storage.addFunctionSchema(functionName, schema);
    });

    sqlParser.tableNames.forEach(functionName => {
      const schema = databox.tables[functionName].schema || {};
      storage.addTableSchema(functionName, schema);
    });

    const inputByFunctionName = sqlParser.extractFunctionInputs(storage.schemasByFunctionName, request.boundValues);
    const outputByFunctionName: { [name: string]: any[] } = {};

    for (const functionName of Object.keys(inputByFunctionName)) {
      const funcStartTime = Date.now();
      const functionInput = inputByFunctionName[functionName];

      if (!registryEntry.functionsByName[functionName]) {
        throw new Error(`${functionName} is not a valid function name for this Databox`);
      }
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

      const paymentProcessor = await newPaymentProcessor(context, request.payment, request.pricingPreferences, functionName, registryEntry);

      const { output } = await context.workTracker.trackRun(
        execDataboxFunction(
          databox,
          manifest,
          functionName,
          functionInput,
        ),
      );
      outputByFunctionName[functionName] = Array.isArray(output) ? output : [output];

      const resultBytes = Buffer.byteLength(Buffer.from(JSON.stringify(output), 'utf8'));
      let microgons = 0;
      if (paymentProcessor) {
        microgons = await paymentProcessor.claim(resultBytes);
      }
      totalMicrogons += microgons;

      const millis = Date.now() - funcStartTime;
      context.databoxRegistry.recordStats(registryEntry.versionHash, functionName, {
        bytes: resultBytes,
        microgons,
        millis,
      });
    }

    const boundValues = sqlParser.convertToBoundValuesMap(request.boundValues);
    const sqlQuery = new SqlQuery(sqlParser, storage, db); 
    const records = sqlQuery.execute(inputByFunctionName, outputByFunctionName, boundValues);

    const totalMillis = Date.now() - startTime;
    const totalBytes = Buffer.byteLength(Buffer.from(JSON.stringify(records), 'utf8'));

    return {
      output: records,
      latestVersionHash: registryEntry.latestVersionHash,
      metadata: {
        milliseconds: totalMillis,
        microgons: totalMicrogons,
        bytes: totalBytes,
      },
    };
  },
});

async function newPaymentProcessor(
  context: IDataboxApiContext,
  requestPayment: IDataboxApiTypes['Databox.query']['args']['payment'],
  pricingPreferences: IDataboxApiTypes['Databox.query']['args']['pricingPreferences'],
  functionName: string,
  databox: IDataboxRecord & { statsByFunction: { [name: string]: IDataboxStatsRecord } },
): Promise<PaymentProcessor> {
  const { sidechainClientManager, configuration } = context;
  const stats = databox.statsByFunction[functionName];
  const pricePerQuery = databox.functionsByName[functionName].pricePerQuery;
  
  if (!requestPayment?.giftCard && !requestPayment?.micronote) {
    if (pricePerQuery || configuration.computePricePerKb) {
      throw new MicronotePaymentRequiredError('This databox requires payment', stats.averagePrice);
    }
    return;
  }

  if (!configuration.paymentAddress && !configuration.defaultSidechainHost) return null;

  const { giftCard, micronote } = requestPayment;

  const sidechainClient = micronote
    ? await sidechainClientManager.withIdentity(micronote.sidechainIdentity)
    : sidechainClientManager.defaultClient;

  const approvedSidechainRootIdentities =
    await sidechainClientManager.getApprovedSidechainRootIdentities();
  const settings = await sidechainClient.getSettings(true);

  const paymentProcessor = new PaymentProcessor(
    requestPayment,
    {
      anticipatedBytesPerQuery: stats.averageBytes,
      approvedSidechainRootIdentities,
      cachedResultDiscount: 0.2,
    },
    sidechainClient,  
    settings.settlementFeeMicrogons,
    settings.latestBlockSettings,
    context.logger,
  );

  if (giftCard) {
    if (!configuration.giftCardsAllowed || !databox.giftCardIssuerIdentity) {
      const rejector = !databox.giftCardIssuerIdentity ? 'databox' : 'Miner';
      throw new InvalidMicronoteError(`This ${rejector} is not accepting gift cards.`);
    }

    let giftCardIssuers = giftCardIssuersById[giftCard.id];
    if (!giftCardIssuers) {
      giftCardIssuers =
        (await sidechainClient.giftCards.get(giftCard.id)?.then(x => x.issuerIdentities)) ?? [];
      giftCardIssuersById[giftCard.id] = giftCardIssuers;
    }

    // ensure gift card is valid for this server
    for (const issuer of [
      databox.giftCardIssuerIdentity,
      configuration.giftCardsRequiredIssuerIdentity,
    ]) {
      if (!issuer) continue;
      if (!giftCardIssuers.includes(issuer))
        throw new Error(`This gift card does not include all required issuers (${issuer})`);
    }

    if (configuration.giftCardsRequiredIssuerIdentity) {
      paymentProcessor.addAddressPayable(configuration.giftCardsRequiredIssuerIdentity, {
        pricePerKb: configuration.computePricePerKb,
      });
    }
    paymentProcessor.addAddressPayable(databox.giftCardIssuerIdentity, {
      pricePerQuery,
    });
    await paymentProcessor.createGiftCardHold();
  } else {
    paymentProcessor.addAddressPayable(configuration.paymentAddress, {
      pricePerKb: configuration.computePricePerKb,
    });
    paymentProcessor.addAddressPayable(databox.paymentAddress, {
      pricePerQuery,
    });
    await paymentProcessor.lock(pricingPreferences);
  }

  return paymentProcessor;
}

async function openDatabox(
  path: string,
  manifest: IDataboxManifest,
): Promise<Databox<any, any>> {
  const script = await getVMScript(path, manifest);
  
  let databox = getVm().run(script) as Databox<any, any>;
  if (databox instanceof Function) {
    databox = databox.databox;
  }
  if (!(databox instanceof Databox)) {
    throw new Error(
      'The default export from this script needs to inherit from "@ulixee/databox"',
    );
  }

  return databox;
}

async function execDataboxFunction(
  databox: Databox<any, any>,
  manifest: IDataboxManifest,
  functionName: string,
  input: any,
): Promise<{ output: any }> {
  const databoxFunction: Function = databox.functions?.[functionName];

  if (!databoxFunction) {
    throw new Error(`${functionName} is not a valid Function name for this Databox.`)
  }

  const bridge = new TransportBridge();
  const connectionToDataboxCore = new ConnectionToDataboxCore(bridge.transportToCore);
  DataboxCore.addConnection(bridge.transportToClient).isInternal = true;
  databox.addConnectionToDataboxCore(connectionToDataboxCore, manifest);

  const options = { input };
  for (const plugin of Object.values(DataboxCore.pluginCoresByName)) {
    if (plugin.beforeExecFunction) await plugin.beforeExecFunction(options);
  }

  const output = await databoxFunction.exec(options);
  return { output };
}

const compiledScriptsByPath = new Map<string, Promise<VMScript>>();

function getVMScript(path: string, manifest: IDataboxManifest): Promise<VMScript> {
  if (compiledScriptsByPath.has(path)) {
    return compiledScriptsByPath.get(path);
  }

  const script = new Promise<VMScript>(async resolve => {
    const file = await Fs.readFile(path, 'utf8');
    const vmScript = new VMScript(file, {
      filename: manifest.scriptEntrypoint,
    }).compile();
    resolve(vmScript);
  });

  compiledScriptsByPath.set(path, script);
  return script;
}

let vm: NodeVM;

function getVm(): NodeVM {
  if (!vm) {
    const whitelist: Set<string> = new Set(
      ...Object.values(DataboxCore.pluginCoresByName).map(x => x.nodeVmRequireWhitelist || []),
    );
    whitelist.add('@ulixee/*');

    vm = new NodeVM({
      console: 'inherit',
      sandbox: {},
      wasm: false,
      eval: false,
      wrapper: 'commonjs',
      strict: true,
      require: {
        external: Array.from(whitelist),
      },
    });
  }

  return vm;
}