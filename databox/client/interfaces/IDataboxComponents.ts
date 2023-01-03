import Function from '../lib/Function';
import Table from '../lib/Table';

export default interface IDataboxComponents<
  TTable extends Table<any>,
  TFunction extends Function<any>,
> {
  name?: string;
  description?: string;
  remoteDataboxes?: { [source: string]: string };
  tables?: Record<string, TTable>;
  functions?: Record<string, TFunction>;
  paymentAddress?: string;
  giftCardIssuerIdentity?: string;
  authenticateIdentity?(identity: string, nonce: string): Promise<boolean> | boolean;
}
