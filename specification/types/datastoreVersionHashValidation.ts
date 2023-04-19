import { z } from '@ulixee/specification';

export const datastoreRegex = /dbx1[ac-hj-np-z02-9]{18}/;
export const datastoreVersionHashValidation = z
  .string()
  .length(22)
  .regex(
    new RegExp(`^${datastoreRegex.source}`),
    'This is not a Datastore versionHash (first 22 characters of the bech32 encoded hash, first 4 characters are "dbx1").',
  );
