import { addressValidation, identityValidation } from '@ulixee/platform-specification/types';
import { z } from 'zod';
import { Chain } from '@argonprotocol/localchain';
import { datastoreIdValidation } from './datastoreIdValidation';
import { DatastorePricing } from './IDatastorePricing';
import { semverValidation } from './semverValidation';

export const minDate = new Date('2022-01-01').getTime();
export const DatastorePaymentRecipientSchema = z.object({
  chain: z.nativeEnum(Chain),
  genesisHash: z.string().regex(/^(0[xX])?[0-9a-fA-F]{64}$/),
  address: addressValidation.describe(
    'A payment address microchannel payments should be made out to.',
  ),
  notaryId: z.number(),
});

export const DatastoreManifestSchema = z.object({
  id: datastoreIdValidation.describe('A unique id for the Datastore'),
  version: semverValidation,
  name: z.string().optional(),
  description: z.string().optional(),
  storageEngineHost: z
    .string()
    .url(
      'The storage engine host to use for this Datastore. If empty, will default to a local host.',
    )
    .optional(),
  versionTimestamp: z.number().int().gt(minDate),
  scriptHash: z
    .string()
    .describe('A sha256 of the script contents.')
    .length(62)
    .regex(
      /^scr1[ac-hj-np-z02-9]{58}$/,
      'This is not a Datastore scriptHash (Bech32m encoded hash starting with "scr").',
    ),
  adminIdentities: identityValidation
    .array()
    .describe(
      'Administrators of this Datastore. If none are present, defaults to Administrators on the Cloud.',
    ),
  scriptEntrypoint: z.string().describe('A relative path from a project root'),
  coreVersion: z.string().describe('Version of the Datastore Core Runtime'),
  schemaInterface: z.string().optional().describe('The raw typescript schema for this Datastore'),
  extractorsByName: z.record(
    z
      .string()
      .regex(/^[a-z][A-Za-z0-9]+$/)
      .describe('The Extractor name'),
    z.object({
      description: z.string().optional(),
      corePlugins: z
        .record(z.string())
        .optional()
        .describe('Plugin dependencies required for execution'),
      schemaAsJson: z
        .object({
          input: z.any().optional(),
          output: z.any().optional(),
          inputExamples: z.any().optional(),
        })
        .optional()
        .describe('The schema as json.'),
      prices: DatastorePricing.array()
        .min(1)
        .optional()
        .describe(
          'Price details for a function call. This array will have an entry for each function called in this process. ' +
            'The first entry is the cost of the function packaged in this Datastore.',
        ),
    }),
  ),
  crawlersByName: z.record(
    z
      .string()
      .regex(/^[a-z][A-Za-z0-9]+$/)
      .describe('The Crawler name'),
    z.object({
      description: z.string().optional(),
      corePlugins: z
        .record(z.string())
        .optional()
        .describe('Plugin dependencies required for execution'),
      schemaAsJson: z
        .object({
          input: z.any().optional(),
          output: z.any().optional(),
          inputExamples: z.any().optional(),
        })
        .optional()
        .describe('The schema as json.'),
      prices: DatastorePricing.array()
        .min(1)
        .optional()
        .describe(
          'Price details for a function call. This array will have an entry for each function called in this process. ' +
            'The first entry is the cost of the function packaged in this Datastore.',
        ),
    }),
  ),
  tablesByName: z.record(
    z
      .string()
      .regex(/^[a-z][A-Za-z0-9]+$/)
      .describe('The Table name'),
    z.object({
      description: z.string().optional(),
      schemaAsJson: z.record(z.string(), z.any()).optional().describe('The schema as json.'),
      prices: DatastorePricing.array()
        .min(1)
        .optional()
        .describe(
          'Price details for a table call. This array will have an entry for each table called in this process. ' +
            'The first entry is the cost of the table packaged in this Datastore.',
        ),
    }),
  ),
  domain: z
    .string()
    .optional()
    .describe(
      'A data domain for this manifest. It can be looked up in the mainchain as a dns lookup for the version hosting.\n' +
        'DATASTORE DEVELOPER NOTE: this property is used to indicate to tooling and CloudNode hosting that a domain is in effect and ChannelHolds must match this setting, but it does not register anything in and of itself.',
    ),
});

type IDatastoreManifest = z.infer<typeof DatastoreManifestSchema>;
type IDatastorePaymentRecipient = z.infer<typeof DatastorePaymentRecipientSchema>;
export { IDatastorePaymentRecipient };

export default IDatastoreManifest;
