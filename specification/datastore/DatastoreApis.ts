import { z } from '@ulixee/specification';
import {
  identityValidation,
  micronoteTokenValidation,
  signatureValidation,
} from '@ulixee/specification/common';
import { IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
import { DatastoreManifestWithLatest } from '../services/DatastoreRegistryApis';
import {
  DatastoreCrawlerPricing,
  DatastoreExtractorPricing,
  DatastoreTablePricing,
} from '../types/IDatastorePricing';
import { DatastoreStatsSchema } from '../types/IDatastoreStats';
import { PaymentSchema } from '../types/IPayment';
import { datastoreVersionHashValidation } from '../types/datastoreVersionHashValidation';

const FunctionMetaSchema = z.object({
  description: z.string().optional(),
  stats: DatastoreStatsSchema,
  pricePerQuery: micronoteTokenValidation.describe('The base price per query.'),
  minimumPrice: micronoteTokenValidation.describe(
    'Minimum microgons that must be allocated for a query to be accepted.',
  ),
  schemaJson: z.any().optional().describe('The schema JSON if requested'),
});

export const DatastoreApiSchemas = {
  'Datastore.upload': {
    args: z.object({
      compressedDbx: z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
      allowNewLinkedVersionHistory: z
        .boolean()
        .describe(
          'Allow this upload to start a new version chain (do not link to previous versions)',
        ),
      adminIdentity: identityValidation
        .optional()
        .describe(
          'If this server is in production mode, an AdminIdentity approved on the Server or Datastore.',
        ),
      adminSignature: signatureValidation
        .optional()
        .describe('A signature from an approved AdminIdentity'),
      payment: PaymentSchema.optional(),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
  'Datastore.download': {
    args: z.object({
      versionHash: datastoreVersionHashValidation.describe(
        'The hash of a unique datastore version',
      ),
      requestDate: z.date().describe('Date of this request. Must be in last 10 seconds.'),
      adminIdentity: identityValidation
        .optional()
        .describe(
          'If this server is in production mode, an AdminIdentity approved on the Server or Datastore.',
        ),
      adminSignature: signatureValidation
        .optional()
        .describe('A signature from an approved AdminIdentity'),
      payment: PaymentSchema.optional(),
    }),
    result: z.object({
      adminIdentity: identityValidation.describe(
        'The admin identity who uploaded this Datastore (used for proof in public network).',
      ),
      adminSignature: signatureValidation.describe(
        'The signature of the uploader of this Datastore (used for proof in public network).',
      ),
      compressedDbx: z.instanceof(Buffer).describe('Bytes of the compressed .dbx directory.'),
    }),
  },
  'Datastore.start': {
    args: z.object({
      dbxPath: z.string().describe('Path to a local file system Database path.'),
      watch: z.boolean().describe('Whether to watch for updates'),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
  'Datastore.creditsBalance': {
    args: z.object({
      datastoreVersionHash: datastoreVersionHashValidation.describe(
        'The hash of the Datastore version to look at credits for.',
      ),
      creditId: z.string().describe('CreditId issued by this datastore.'),
    }),
    result: z.object({
      issuedCredits: micronoteTokenValidation.describe('Issued credits balance in microgons.'),
      balance: micronoteTokenValidation.describe('Remaining credits balance in microgons.'),
    }),
  },
  'Datastore.creditsIssued': {
    args: z.object({
      datastoreVersionHash: datastoreVersionHashValidation.describe(
        'The hash of the Datastore version to look at credits for.',
      ),
    }),
    result: z.object({
      issuedCredits: micronoteTokenValidation.describe(
        'Total credit microgons issued in microgons.',
      ),
      count: micronoteTokenValidation.describe('Total credits issued in microgons.'),
    }),
  },
  'Datastore.admin': {
    args: z.object({
      versionHash: datastoreVersionHashValidation.describe(
        'The hash of a unique datastore version',
      ),
      adminIdentity: identityValidation
        .optional()
        .describe('An admin Identity for this Datastore.'),
      adminSignature: signatureValidation
        .optional()
        .describe('A signature from the admin Identity'),
      adminFunction: z.object({
        ownerType: z
          .enum(['table', 'crawler', 'extractor', 'datastore'])
          .describe('Where to locate the function.'),
        ownerName: z
          .string()
          .describe('The name of the owning extractor, table or crawler (if applicable).')
          .optional(),
        functionName: z.string().describe('The name of the function'),
      }),
      functionArgs: z.any().array().describe('The args to provide to the function.'),
    }),
    result: z.any().describe('A flexible result based on the type of api.'),
  },
  'Datastore.meta': {
    args: z.object({
      versionHash: datastoreVersionHashValidation.describe(
        'The hash of a unique datastore version',
      ),
      includeSchemasAsJson: z
        .boolean()
        .optional()
        .describe('Include JSON describing the schema for each function'),
    }),
    result: DatastoreManifestWithLatest.extend({
      stats: DatastoreStatsSchema,
      extractorsByName: z.record(
        z.string().describe('The name of the extractor'),
        FunctionMetaSchema.extend({
          priceBreakdown: DatastoreExtractorPricing.array(),
        }),
      ),
      crawlersByName: z.record(
        z.string().describe('The name of the crawler'),
        FunctionMetaSchema.extend({
          priceBreakdown: DatastoreCrawlerPricing.array(),
        }),
      ),
      tablesByName: z.record(
        z.string().describe('The name of a table'),
        z.object({
          description: z.string().optional(),
          stats: DatastoreStatsSchema,
          pricePerQuery: micronoteTokenValidation.describe('The table base price per query.'),
          priceBreakdown: DatastoreTablePricing.array(),
          schemaJson: z.any().optional().describe('The schema JSON if requested'),
        }),
      ),
      schemaInterface: z
        .string()
        .optional()
        .describe(
          'A Typescript interface describing input and outputs of Datastore Extractors, and schemas of Datastore Tables',
        ),
      computePricePerQuery: micronoteTokenValidation.describe(
        'The current server price per query. NOTE: if a server is implementing surge pricing, this amount could vary.',
      ),
    }),
  },
  'Datastore.stream': {
    args: z.object({
      id: z.string().describe('The id of this query.'),
      name: z.string().describe('The name of the table or function'),
      input: z.any().optional().describe('Optional input or where parameters'),
      versionHash: datastoreVersionHashValidation.describe(
        'The hash of this unique datastore version',
      ),
      payment: PaymentSchema.optional().describe('Payment for this request.'),
      affiliateId: z
        .string()
        .regex(/aff[a-zA-Z_0-9-]{10}/)
        .optional()
        .describe('A tracking id to attribute payments to source affiliates.'),
      authentication: z
        .object({
          identity: identityValidation,
          signature: signatureValidation,
          nonce: z.string().length(10).describe('A random nonce adding signature noise.'),
        })
        .optional(),
      pricingPreferences: z
        .object({
          maxComputePricePerQuery: micronoteTokenValidation.describe(
            'Maximum price to pay for compute costs per query (NOTE: This only applies to Servers implementing surge pricing).',
          ),
        })
        .optional(),
    }),
    result: z.object({
      latestVersionHash: datastoreVersionHashValidation,
      metadata: z
        .object({
          microgons: micronoteTokenValidation,
          bytes: z.number().int().nonnegative(),
          milliseconds: z.number().int().nonnegative(),
        })
        .optional(),
    }),
  },
  'Datastore.query': {
    args: z.object({
      id: z.string().describe('The unique id of this query.'),
      sql: z.string().describe('The SQL command(s) you want to run'),
      boundValues: z
        .array(z.any())
        .optional()
        .describe('An array of values you want to use as bound parameters'),
      versionHash: datastoreVersionHashValidation.describe(
        'The hash of this unique datastore version',
      ),
      affiliateId: z
        .string()
        .regex(/aff[a-zA-Z_0-9-]{10}/)
        .optional()
        .describe('A tracking id to attribute payments to source affiliates.'),
      payment: PaymentSchema.optional().describe(
        'Payment for this request created with an approved Ulixee Sidechain.',
      ),
      authentication: z
        .object({
          identity: identityValidation,
          signature: signatureValidation,
          nonce: z.string().length(10).describe('A random nonce adding signature noise.'),
        })
        .optional(),
      pricingPreferences: z
        .object({
          maxComputePricePerQuery: micronoteTokenValidation.describe(
            'Maximum price to pay for compute costs per query (NOTE: This only applies to Servers implementing surge pricing).',
          ),
        })
        .optional(),
    }),
    result: z.object({
      latestVersionHash: datastoreVersionHashValidation,
      outputs: z.any().array(),
      metadata: z
        .object({
          microgons: micronoteTokenValidation,
          bytes: z.number().int().nonnegative(),
          milliseconds: z.number().int().nonnegative(),
        })
        .optional(),
    }),
  },
  'Datastore.createStorageEngine': {
    args: z.object({
      version: z.object({
        compressedDbx: z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
        allowNewLinkedVersionHistory: z
          .boolean()
          .describe(
            'Did this upload create a new version history (necessary for signature message)',
          ),
        adminIdentity: identityValidation
          .optional()
          .describe(
            'If this server is in production mode, an AdminIdentity approved on the Server or Datastore.',
          ),
        adminSignature: signatureValidation
          .optional()
          .describe('A signature from an approved AdminIdentity'),
      }),
      previousVersion: z
        .object({
          compressedDbx: z.instanceof(Buffer).describe('Bytes of a compressed .dbx directory.'),
          allowNewLinkedVersionHistory: z
            .boolean()
            .describe(
              'Did this upload create a new version history (necessary for signature message)',
            ),
          adminIdentity: identityValidation
            .optional()
            .describe(
              'If this server is in production mode, an AdminIdentity approved on the Server or Datastore.',
            ),
          adminSignature: signatureValidation
            .optional()
            .describe('A signature from an approved AdminIdentity'),
        })
        .nullable()
        .optional(),
      payment: PaymentSchema.optional(),
    }),
    result: z.object({
      success: z.boolean(),
    }),
  },
  'Datastore.queryStorageEngine': {
    args: z.object({
      id: z.string().describe('The unique id of this query.'),
      versionHash: datastoreVersionHashValidation.describe('The Datastore version to be queried.'),
      sql: z.string().describe('The SQL command you want to run.'),
      boundValues: z
        .array(z.any())
        .optional()
        .describe('An array of values you want to use as bound parameters.'),
      virtualEntitiesByName: z
        .record(
          z
            .string()
            .describe(
              'Name of the passthrough table, extractor or crawler defined in the Datastore schema.',
            ),
          z.object({
            parameters: z
              .record(
                z.string().describe("Parameter name matching the entity's schema."),
                z
                  .any()
                  .describe('Parameter value as a Javascript type (will be converted by engine).'),
              )
              .optional()
              .describe('Parameters to simulate for this virtual function or table'),
            records: z
              .any()
              .array()
              .describe('Records to simulate (NOTE: must match the Datastore schema).'),
          }),
        )
        .optional()
        .describe(
          'Virtual passthrough tables, extractors or crawlers being simulated in the sql query.',
        ),
      payment: PaymentSchema.optional().describe('Payment for this request.'),
      authentication: z
        .object({
          identity: identityValidation,
          signature: signatureValidation,
          nonce: z.string().length(10).describe('A random nonce adding signature noise.'),
        })
        .optional(),
    }),
    result: z.object({
      outputs: z.any().array(),
      metadata: z
        .object({
          microgons: micronoteTokenValidation,
          bytes: z.number().int().nonnegative(),
          milliseconds: z.number().int().nonnegative(),
        })
        .optional(),
    }),
  },
  'Datastores.list': {
    args: z.object({
      offset: z
        .number()
        .optional()
        .describe('Starting offset (inclusive) of results to return')
        .default(0),
    }),
    result: z.object({
      datastores: z
        .object({
          name: z.string().optional(),
          description: z.string().optional(),
          isStarted: z
            .boolean()
            .describe('Only relevant in development mode - is this Datastore started.'),
          scriptEntrypoint: z.string(),
          versionHash: datastoreVersionHashValidation,
          versionTimestamp: z.number().int().positive().describe('Millis since epoch'),
          domain: z
            .string()
            .optional()
            .describe('A Custom DNS name pointing at the latest version of the Datastore.'),
          latestVersionHash: datastoreVersionHashValidation.describe(
            'The latest version hash of this datastore',
          ),
          stats: DatastoreStatsSchema,
        })
        .array(),
      count: z.number().describe('Total datastores.'),
      offset: z.number().describe('Offset index of result (inclusive).'),
    }),
  },
};

type IDatastoreApiTypes = IZodSchemaToApiTypes<typeof DatastoreApiSchemas>;

export default IDatastoreApiTypes;
