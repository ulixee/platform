import IDatastoreManifest from '@ulixee/specification/types/IDatastoreManifest';

type TPrices = { perQuery: number; minimum: number };
type TSchema = IDatastoreManifest['runnersByName'][0]['schemaAsJson'];

export default interface IDocpageConfig {
  versionHash: string;
  name: string;
  description: string;
  createdAt: string;
  defaultExample: {
    type: 'table' | 'runner' | 'crawler';
    name: string;
    formatted: string;
    args: Record<string, any>;
  };
  runnersByName: {
    [name: string]: {
      name: string;
      description: string;
      schema: TSchema;
      prices: TPrices[];
    };
  };
  crawlersByName: {
    [name: string]: {
      name: string;
      description: string;
      schema: TSchema;
      prices: TPrices[];
    };
  };
  tablesByName: {
    [name: string]: {
      name: string;
      description: string;
      schema: TSchema;
      prices: TPrices[];
    };
  };
}
