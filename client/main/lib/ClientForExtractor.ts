import { Extractor } from '@ulixee/datastore';
import { IDatastoreBinding } from '@ulixee/datastore/lib/DatastoreInternal';
import ResultIterable from '@ulixee/datastore/lib/ResultIterable';
import { IOutputSchema } from '../interfaces/IInputOutput';

export default class ClientForExtractor<TExtractor extends Extractor> {
  private extractor: TExtractor;
  private readonly readyPromise: Promise<any>;

  constructor(extractor: TExtractor, options?: IDatastoreBinding) {
    this.extractor = extractor;
    this.readyPromise = this.extractor.bind(options).catch(() => null);
  }

  public fetch(
    inputFilter: TExtractor['schemaType']['input'],
  ): ResultIterable<TExtractor['schema']['output']> {
    return this.extractor.runInternal(
      { input: inputFilter },
      {
        beforeQuery: () => this.readyPromise,
      },
    );
  }

  public run(
    inputFilter?: TExtractor['schemaType']['input'],
  ): ResultIterable<TExtractor['schemaType']['output']> {
    return this.fetch(inputFilter);
  }

  public async query<TSchema extends IOutputSchema = IOutputSchema>(
    sql: string,
    boundValues: any[] = [],
  ): Promise<TSchema[]> {
    await this.readyPromise;
    return this.extractor.queryInternal(sql, boundValues);
  }
}
