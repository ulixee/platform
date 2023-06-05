import { z } from '@ulixee/specification';

// ~208 thousands of years of work to have a 1% chance of collision.
// Bech32m is a bit of an odd choice since we're lopping off the checksum, but keeping for now to keep encoding consistent.
export const datastoreRegex = /dbx1[ac-hj-np-z02-9]{18}/;
export const datastoreVersionHashValidation = z
  .string()
  .length(22)
  .regex(
    new RegExp(`^${datastoreRegex.source}`),
    'This is not a Datastore versionHash (first 22 characters of the bech32 encoded hash, first 4 characters are "dbx1").',
  );
