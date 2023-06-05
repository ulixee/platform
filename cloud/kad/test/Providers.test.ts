import { sha256 } from '@ulixee/commons/lib/hashUtils';
import Identity from '@ulixee/crypto/lib/Identity';
import * as Fs from 'fs';
import * as Path from 'path';
import KadDb from '../db/KadDb';
import NodeId from '../interfaces/NodeId';
import { Providers } from '../lib/Providers';
import { delay } from './_helpers';

const dbPath = Path.resolve(process.env.ULX_DATA_DIR ?? '.', 'Providers.test', 'kad.db');

describe('Providers', () => {
  const nodeIds: NodeId[] = Array(3)
    .fill(0)
    .map(Identity.createSync)
    .map(x => x.bech32);
  let providers: Providers;

  afterEach(async () => {
    await providers?.stop();
    await Fs.promises.rm(dbPath, { recursive: true }).catch(() => null);
  });

  it('simple add and get of providers', async () => {
    providers = new Providers({
      db: new KadDb(dbPath),
    });

    const key = sha256(Buffer.from('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'));

    providers.addProvider(key, nodeIds[0]);
    providers.addProvider(key, nodeIds[1]);

    const provs = await providers.getProviders(key);
    const ids = new Set(provs.map(peerId => peerId.toString()));
    expect(ids.has(nodeIds[0].toString())).toBe(true);
  });

  it('duplicate add of provider is deduped', async () => {
    providers = new Providers({
      db: new KadDb(dbPath),
    });

    const key = sha256(Buffer.from('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'));

    providers.addProvider(key, nodeIds[0]);
    providers.addProvider(key, nodeIds[0]);
    providers.addProvider(key, nodeIds[1]);
    providers.addProvider(key, nodeIds[1]);
    providers.addProvider(key, nodeIds[1]);

    const provs = await providers.getProviders(key);
    expect(provs).toHaveLength(2);
    const ids = new Set(provs.map(peerId => peerId.toString()));
    expect(ids.has(nodeIds[0])).toBe(true);
  });

  it('more providers than space in the lru cache', async () => {
    providers = new Providers(
      {
        db: new KadDb(dbPath),
      },
      {
        cacheSize: 10,
      },
    );

    const keys = await Promise.all(
      [...new Array(100)].map(async (i: number) => {
        return sha256(Buffer.from(`hello ${i}`));
      }),
    );

    await Promise.all(
      keys.map(async key => {
        await providers.addProvider(key, nodeIds[0]);
      }),
    );
    const provs = await Promise.all(keys.map(async key => providers.getProviders(key)));

    expect(provs).toHaveLength(100);
    for (const p of provs) {
      expect(p[0].toString()).toBe(nodeIds[0]);
    }
  });

  it('expires', async () => {
    providers = new Providers(
      {
        db: new KadDb(dbPath),
      },
      {
        cleanupInterval: 100,
        provideValidity: 200,
      },
    );
    await providers.start();

    const key = sha256(Buffer.from('QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n'));

    providers.addProvider(key, nodeIds[0]);
    providers.addProvider(key, nodeIds[1]);

    const provs = await providers.getProviders(key);

    expect(provs).toHaveLength(2);
    expect(provs[0].toString()).toBe(nodeIds[0].toString());
    expect(provs[1].toString()).toBe(nodeIds[1].toString());

    await delay(400);

    const provsAfter = await providers.getProviders(key);
    expect(provsAfter).toHaveLength(0);
    await providers.stop();
  });
});
