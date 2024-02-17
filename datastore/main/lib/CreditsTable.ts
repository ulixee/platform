import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { sha256 } from '@ulixee/commons/lib/hashUtils';
import { buffer, ExtractSchemaType, number, string } from '@ulixee/schema';
import { customAlphabet, nanoid } from 'nanoid';
import Table from './Table';

const postgresFriendlyNanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
);

export default class CreditsTable extends Table<typeof CreditsSchema> {
  public static tableName = 'ulx_credits' as const;

  constructor() {
    super({
      name: CreditsTable.tableName,
      isPublic: false,
      description: 'Private table tracking Credits issued for the containing Datastore.',
      schema: CreditsSchema,
      basePrice: 0,
      async onVersionMigrated(previousVersion: Table<typeof CreditsSchema>): Promise<void> {
        const previousCredits = await previousVersion.fetchInternal();
        await this.insertInternal(...previousCredits);
      },
    });
  }

  async create(
    microgons: number,
    secret?: string,
  ): Promise<{ id: string; secret: string; remainingCredits: number }> {
    const upstreamBalance = await this.getUpstreamCreditLimit();
    if (upstreamBalance !== undefined) {
      const allocated = (await this.queryInternal<{ total: number }>(
        'SELECT SUM(issuedCredits) as total FROM self',
      )) as any;
      if (allocated.total + microgons > upstreamBalance) {
        throw new Error(
          `This credit amount would exceed the balance of the embedded Credits, which would make use of the Credits unstable. Please increase the limit of the credits.`,
        );
      }
    }
    const salt = nanoid(16);
    const id = `crd${postgresFriendlyNanoid(8)}`;
    secret ??= postgresFriendlyNanoid(12);
    const secretHash = sha256(concatAsBuffer(id, salt, secret));
    await this.queryInternal(
      'INSERT INTO self (id, salt, secretHash, issuedCredits, remainingCredits) VALUES ($1, $2, $3, $4, $4)',
      [id, salt, secretHash, microgons],
    );
    return { id, secret, remainingCredits: microgons };
  }

  async get(id: string): Promise<Omit<ICredit, 'salt' | 'secretHash'>> {
    const [credit] = await this.queryInternal(
      'SELECT id, issuedCredits, remainingCredits FROM self WHERE id = $1',
      [id],
    );
    return credit;
  }

  async summary(): Promise<{ count: number; microgons: number }> {
    const [result] = await this.queryInternal<{ count: number; microgons: number }[]>(
      'SELECT COUNT(1) as count, SUM(issuedCredits) as microgons FROM self',
    );
    return result;
  }

  async debit(id: string, secret: string, amount: number): Promise<number> {
    const [credit] = await this.queryInternal('SELECT * FROM self WHERE id=$1', [id]);
    if (!credit) throw new Error('This is an invalid Credit.');

    const hash = sha256(concatAsBuffer(credit.id, credit.salt, secret));
    if (!hash.equals(credit.secretHash)) throw new Error('This is an invalid Credit secret.');

    if (credit.remainingCredits < amount)
      throw new Error('This Credit has insufficient balance remaining to create a payment.');

    const result = (await this.queryInternal(
      'UPDATE self SET remainingCredits = remainingCredits - $2 ' +
        'WHERE id = $1 AND (remainingCredits - $2) >= 0 ' +
        'RETURNING remainingCredits',
      [id, amount],
    )) as any;

    if (result === undefined) throw new Error('Could not create a payment from the given Credits.');
    return result.remainingCredits;
  }

  async finalize(id: string, refund: number): Promise<void> {
    await this.queryInternal(
      'UPDATE self SET remainingCredits = remainingCredits + $2 WHERE id = $1',
      [id, refund],
    );
  }

  private async getUpstreamCreditLimit(): Promise<number | undefined> {
    const embeddedCredits = this.datastoreInternal.metadata.remoteDatastoreEmbeddedCredits ?? {};
    if (!Object.keys(embeddedCredits).length) return undefined;
    let issuedCredits = 0;
    for (const [source, credit] of Object.entries(embeddedCredits)) {
      try {
        const { client, datastoreHost } = await this.datastoreInternal.getRemoteApiClient(source);
        const balance = await client.getCreditsBalance(
          datastoreHost.datastoreId,
          datastoreHost.version,
          credit.id,
        );
        if (Number.isInteger(balance.issuedCredits)) issuedCredits += balance.issuedCredits;
      } catch (err) {}
    }
    return issuedCredits;
  }
}

export const CreditsSchema = {
  id: string({ regexp: /^crd[A-Za-z0-9_]{8}$/ }),
  salt: string({ length: 16 }),
  secretHash: buffer(),
  issuedCredits: number(),
  remainingCredits: number(),
};
type ICredit = ExtractSchemaType<typeof CreditsSchema>;
