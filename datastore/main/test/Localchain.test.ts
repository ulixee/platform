import { Keyring } from '@polkadot/keyring';
import { Helpers } from '@ulixee/datastore-testing';
import { CryptoScheme, Localchain } from '@ulixee/localchain';
import { AccountType } from '@ulixee/platform-specification/types/IBalanceChange';
import INotarization, {
  NotarizationSchema,
} from '@ulixee/platform-specification/types/INotarization';
import ValidationError from '@ulixee/platform-specification/utils/ValidationError';
import { mkdir } from 'node:fs/promises';
import * as Path from 'path';
import { inspect } from 'util';
import env from '../env';

inspect.defaultOptions.depth = 11;

const storageDir = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Datastore.clone.test');

afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

test('it can serialize and deserialize a notarization', async () => {
  await mkdir(storageDir, { recursive: true });

  const localchain = await Localchain.loadWithoutMainchain(
    Path.join(storageDir, `localchain.db`),
    env,
  );
  Helpers.onClose(() => localchain.close());
  const keyring = new Keyring({ type: 'ed25519' });
  const address = keyring.addFromUri('//Alice').address;
  await localchain.keystore.importSuri('//Alice', CryptoScheme.Ed25519);
  const balanceBuilder = localchain.beginChange();
  await balanceBuilder.claimFromMainchain({
    transferId: 1,
    address,
    amount: 2n ** 120n,
    expirationTick: 100,
    notaryId: 1,
  });
  await balanceBuilder.leaseDataDomain('example.flights', address);
  await balanceBuilder.sign();

  const json: INotarization = JSON.parse(await balanceBuilder.toJSON());
  expect(json.balanceChanges.find(x => x.accountType === AccountType.Deposit).balance).toBe(
    (2n ** 120n - 1000n).toString(),
  );
  await NotarizationSchema.parseAsync(json).catch(err => {
    console.error(err);
    throw ValidationError.fromZodValidation(`The balance change had some errors`, err);
  });
});
