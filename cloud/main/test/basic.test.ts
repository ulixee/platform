import * as Http from 'http';
import Miner from '../index';

const pkg = require('../package.json');

describe('basic Miner tests', () => {
  it('starts, responds to request and shuts down', async () => {
    const miner = new Miner();
    await miner.listen({ port: 8099 }, false);
    const url = `http://${await miner.address}/`;

    const response = await new Promise(resolve => {
      Http.get(url, res => {
        let data = '';
        res.on('data', x => (data += x));
        res.on('end', () => resolve(data));
      });
    });

    expect(response).toEqual(`Ulixee Miner v${pkg.version}`);

    await miner.close();
  });
});
