import { Extractor } from '@ulixee/datastore';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForExtractor<TExtractor extends Extractor> {
  private extractor: TExtractor;
  constructor(extractor: TExtractor, options?: IDatastoreBinding) {
    this.extractor = extractor;
    extractor.bind(options);
  }

  public fetch(
    inputFilter: TExtractor['schemaType']['input'],
  ): ResultIterable<TExtractor['schema']['output']> {
    return this.extractor.runInternal({ input: inputFilter });
  }

  public run(
    inputFilter?: TExtractor['schemaType']['input'],
  ): ResultIterable<TExtractor['schemaType']['output']> {
    return this.fetch(inputFilter);
  }

  public query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    return this.extractor.queryInternal(sql, boundValues);
  }
}
