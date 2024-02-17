import { Keyring } from '@polkadot/keyring';
import { Helpers } from '@ulixee/datastore-testing';
import { Localchain, Signer } from '@ulixee/localchain';
import INotarization, {
  NotarizationSchema,
} from '@ulixee/platform-specification/types/INotarization';
import ValidationError from '@ulixee/platform-specification/utils/ValidationError';
import { mkdir } from 'node:fs/promises';
import * as Path from 'path';
import { inspect } from 'util';
import { AccountType } from '@ulixee/platform-specification/types/IBalanceChange';
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
  const keyring = new Keyring({ type: 'ecdsa' });
  const address = keyring.addFromUri('//Alice').address;
  const balanceBuilder = localchain.beginChange();
  await balanceBuilder.claimFromMainchain({
    accountNonce: 1,
    address,
    amount: 2n ** 120n,
    expirationBlock: 100,
    notaryId: 1,
  });
  await balanceBuilder.leaseDataDomain(address, address, 'example.flights', address);
  await balanceBuilder.sign(
    new Signer(async (addr, signatureMessage) => {
      return keyring.getPair(addr).sign(signatureMessage, { withType: true });
    }),
  );

  const json: INotarization = JSON.parse(await balanceBuilder.toJson());
  expect(json.balanceChanges.find(x => x.accountType === AccountType.Deposit).balance).toBe(
    (2n ** 120n - 1000n).toString(),
  );
  await NotarizationSchema.parseAsync(json).catch(err => {
    console.error(err);
    throw ValidationError.fromZodValidation(`The balance change had some errors`, err);
  });
});
