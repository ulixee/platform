import { buffer, ExtractSchemaType, number, string } from '@ulixee/schema';
import { sha3 } from '@ulixee/commons/lib/hashUtils';
import { concatAsBuffer } from '@ulixee/commons/lib/bufferUtils';
import { customAlphabet, nanoid } from 'nanoid';
import Table from './Table';

const postgresFriendlyNanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
);

export default class CreditsTable extends Table<typeof CreditsSchema> {
  public static tableName = 'ulx_credits';
  constructor() {
    super({
      name: CreditsTable.tableName,
      isPublic: false,
      description: 'Private table tracking Credits issued for the containing Datastore.',
      schema: CreditsSchema,
      pricePerQuery: 0,
    });
  }

  async create(
    microgons: number,
    secret?: string,
  ): Promise<{ id: string; secret: string; remainingCredits: number }> {
    const salt = nanoid(16);
    const id = `cred${postgresFriendlyNanoid(8)}`;
    secret ??= postgresFriendlyNanoid(12);
    const secretHash = sha3(concatAsBuffer(id, salt, secret));
    await this.query(
      'INSERT INTO self (id, salt, secretHash, issuedCredits, heldCredits, remainingCredits) VALUES ($1, $2, $3, $4, 0, $4)',
      [id, salt, secretHash, microgons],
    );
    return { id, secret, remainingCredits: microgons };
  }

  async get(id: string): Promise<Omit<ICredit, 'salt' | 'secretHash'>> {
    const [credit] = await this.query(
      'SELECT id, issuedCredits, remainingCredits, heldCredits FROM self WHERE id = $1',
      [id],
    );
    return credit;
  }

  async hold(id: string, secret: string, holdAmount: number): Promise<number> {
    const [credit] = await this.query('SELECT * FROM self WHERE id=$1', [id]);
    if (!credit) throw new Error('This is an invalid Credit.');

    const hash = sha3(concatAsBuffer(credit.id, credit.salt, secret));
    if (!hash.equals(credit.secretHash)) throw new Error('This is an invalid Credit secret.');

    const result = (await this.query(
      'UPDATE self SET heldCredits = heldCredits + $2 ' +
        'WHERE id = $1 AND (remainingCredits - heldCredits - $2) >= 0 ' +
        'RETURNING remainingCredits',
      [id, holdAmount],
    )) as any;

    if (result === undefined) throw new Error('Could not hold funds from the given Credits.');
    return result.remainingCredits;
  }

  async finalize(id: string, holdAmount: number, finalAmount: number): Promise<number> {
    const result = (await this.query(
      'UPDATE self SET heldCredits = heldCredits + $2, remainingCredits = remainingCredits - $3 ' +
        'WHERE id = $1 ' +
        'RETURNING remainingCredits',
      [id, holdAmount, finalAmount],
    )) as any;
    if (result === undefined) throw new Error('Could not finalize payment for the given Credits.');
    return result.remainingCredits;
  }
}

export const CreditsSchema = {
  id: string({ regexp: /^cred[A-Za-z0-9_-]{8}$/ }),
  salt: string({ length: 16 }),
  secretHash: buffer(),
  issuedCredits: number(),
  heldCredits: number(),
  remainingCredits: number(),
};
type ICredit = ExtractSchemaType<typeof CreditsSchema>;
