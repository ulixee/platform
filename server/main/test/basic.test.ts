import * as Http from 'http';
import Server from '../index';
const pkg = require('../package.json');

describe('basic Server tests', () => {
  it('starts, responds to request and shuts down', async () => {
    const server = new Server();
    await server.listen({ port: 8099 });
    const url = `http://${await server.address}/`;

    const response = await new Promise(resolve => {
      Http.get(url, res => {
        let data = '';
        res.on('data', x => (data += x));
        res.on('end', () => resolve(data));
      });
    });

    expect(response).toEqual(`Ulixee Server v${pkg.version}`);

    await server.close();
  });
});
