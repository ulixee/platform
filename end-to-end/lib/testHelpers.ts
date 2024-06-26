import { Helpers } from '@ulixee/datastore-testing';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as HttpProxy from 'http-proxy';
import { execSync } from 'node:child_process';
import * as http from 'node:http';
import * as net from 'node:net';
import * as url from 'node:url';

export const describeIntegration = (process.env.SKIP_E2E === "true" || process.env.SKIP_E2E === "1") ? describe.skip : describe;


let proxy: HttpProxy;
let proxyServer: http.Server;

export async function getProxy(): Promise<string> {
  if (!proxy) {
    proxy = HttpProxy.createProxyServer({
      changeOrigin: true,
      ws: true,
      autoRewrite: true,
    });
    proxy.on('error', console.error);
    proxyServer = http.createServer((req, res) => {
      // parse query string and get targetUrl
      const queryData = url.parse(req.url, true).query;
      if (!queryData.target) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Target parameter is required');
        return;
      }
      console.log('Proxying http request', queryData.target);
      proxy.web(req, res, { target: queryData.target as string });
    });
    proxyServer.on('upgrade', (req, clientSocket, head) => {
      const queryData = url.parse(req.url, true).query;
      const target = url.parse(queryData.target as string);
      proxy.ws(req, clientSocket, head, {
        target: target.href,
        ws: true,
      });
      clientSocket.on('error', console.error);
    });
    await new Promise<void>(resolve => proxyServer.listen(0, resolve));
    Helpers.needsClosing.push({
      close: () =>
        new Promise<void>(resolve => {
          proxy.close();
          proxyServer.close(_ => null);
          proxy = null;
          proxyServer = null;
          resolve();
        }),
      onlyCloseOnFinal: true,
    });
  }
  const port = (proxyServer.address() as net.AddressInfo).port;
  return `ws://host.docker.internal:${port}`;
}

export async function getDockerPortMapping(containerName: string, port: number): Promise<string> {
  return execSync(`docker port ${containerName} ${port}`, { encoding: 'utf8' })
    .trim()
    .split(':')
    .pop();
}

export function cleanHostForDocker(host: string): string {
  if (process.env.ULX_USE_DOCKER_BINS) {
    const replacer = 'host.docker.internal';
    return host
      .replace('localhost', replacer)
      .replace('127.0.0.1', replacer)
      .replace('0.0.0.0', replacer);
  }
  return host;
}
