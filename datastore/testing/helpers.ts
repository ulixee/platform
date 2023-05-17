import CloudNode from '@ulixee/cloud'; // eslint-disable-line import/no-extraneous-dependencies
import UlixeeConfig from '@ulixee/commons/config';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import Logger from '@ulixee/commons/lib/Logger';
import IDatastoreCoreConfigureOptions from '@ulixee/datastore-core/interfaces/IDatastoreCoreConfigureOptions';
import DatastoreManifest from '@ulixee/datastore-core/lib/DatastoreManifest';
import Core from '@ulixee/hero-core';
import * as Fs from 'fs/promises';
import * as http from 'http';
import { Server } from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import * as net from 'net';
import * as Path from 'path';
import Koa = require('koa');
import KoaRouter = require('@koa/router');
import KoaMulter = require('@koa/multer');

const { log } = Logger(module);

let didRegisteryBlock = false;
export function blockGlobalConfigWrites(): void {
  if (didRegisteryBlock) return;
  didRegisteryBlock = true;
  // block writing to global files!
  jest.spyOn<any, any>(UlixeeHostsConfig.global, 'save').mockImplementation(() => null);
  // @ts-expect-error
  const write = DatastoreManifest.writeToDisk;
  // @ts-expect-error
  jest.spyOn(DatastoreManifest, 'writeToDisk').mockImplementation(async (path, data) => {
    if (path.includes(UlixeeConfig.global.directoryPath)) return;
    return write.call(DatastoreManifest, path, data);
  });
}

blockGlobalConfigWrites();

export const needsClosing: { close: () => Promise<any> | void; onlyCloseOnFinal?: boolean }[] = [];

export async function createLocalNode(
  config: Partial<IDatastoreCoreConfigureOptions>,
): Promise<CloudNode> {
  if (config.datastoresDir) {
    config.datastoresTmpDir ??= Path.join(config.datastoresDir, 'tmp');

    try {
      await Fs.rm(config.datastoresDir, { recursive: true });
    } catch {}
    await Fs.mkdir(config.datastoresDir, { recursive: true });
  }
  needsClosing.push({ close: () => Fs.rm(config.datastoresDir, { recursive: true }) });

  const cloudNode = new CloudNode();
  cloudNode.datastoreConfiguration = config;
  await cloudNode.listen();
  onClose(() => cloudNode.close(), true);
  return cloudNode;
}

export function onClose(closeFn: (() => Promise<any>) | (() => any), onlyCloseOnFinal = false) {
  needsClosing.push({ close: closeFn, onlyCloseOnFinal });
}

export interface ITestKoaServer extends KoaRouter {
  close: () => void;
  server: http.Server;
  koa: Koa;
  isClosing?: boolean;
  onlyCloseOnFinal?: boolean;
  baseHost: string;
  baseUrl: string;
  upload: KoaMulter.Instance;
}

export async function runKoaServer(onlyCloseOnFinal = true): Promise<ITestKoaServer> {
  const koa = new Koa();
  const router = new KoaRouter() as ITestKoaServer;
  const upload = KoaMulter(); // note you can pass `multer` options here

  koa.use(router.routes()).use(router.allowedMethods());
  koa.on('error', error => log.warn('Koa error', { error } as any));

  const server = await new Promise<Server>(resolve => {
    const koaServer = koa
      .listen(() => {
        resolve(koaServer);
      })
      .unref();
  });

  const destroyer = destroyServerFn(server);

  const port = (server.address() as net.AddressInfo).port;
  router.baseHost = `localhost:${port}`;
  router.baseUrl = `http://${router.baseHost}`;

  router.get('/', ctx => {
    ctx.body = `<html><body>Blank Page</body></html>`;
  });

  router.close = () => {
    if (router.isClosing) {
      return;
    }
    router.isClosing = true;
    return destroyer();
  };
  router.onlyCloseOnFinal = onlyCloseOnFinal;
  needsClosing.push(router);
  router.koa = koa;
  router.server = server;
  router.upload = upload;

  return router;
}

export function afterEach(): Promise<void> {
  return closeAll(false);
}

export async function afterAll(): Promise<void> {
  await closeAll(true);
  await Core.shutdown();
}

async function closeAll(isFinal = false): Promise<void> {
  const closeList = [...needsClosing];
  needsClosing.length = 0;

  await Promise.all(
    closeList.map(async (toClose, i) => {
      if (!toClose.close) {
        // eslint-disable-next-line no-console
        console.log('Error closing', { closeIndex: i });
        return;
      }
      if (toClose.onlyCloseOnFinal && !isFinal) {
        needsClosing.push(toClose);
        return;
      }

      try {
        await toClose.close();
      } catch (err) {
        if (err instanceof CanceledPromiseError) return;
        // eslint-disable-next-line no-console
        console.log('Error shutting down', err);
      }
    }),
  );
}

function destroyServerFn(
  server: http.Server | http2.Http2Server | https.Server,
): () => Promise<void> {
  const connections = new Set<net.Socket>();

  server.on('connection', (conn: net.Socket) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  return () =>
    new Promise(resolve => {
      for (const conn of connections) {
        conn.destroy();
      }
      server.close(() => {
        setTimeout(resolve, 10);
      });
    });
}
