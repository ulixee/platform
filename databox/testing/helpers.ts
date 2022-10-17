import * as http from 'http';
import { Server } from 'http';
import * as https from 'https';
import * as Koa from 'koa';
import * as KoaRouter from '@koa/router';
import * as KoaMulter from '@koa/multer';
import * as net from 'net';
import * as http2 from 'http2';
import Core from '@ulixee/hero-core';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import Hero, { ConnectionToHeroCore } from '@ulixee/hero';
import IDataboxForHeroExecOptions from '@ulixee/databox-for-hero/interfaces/IDataboxForHeroExecOptions';
import TransportBridge from '@ulixee/net/lib/TransportBridge';
import Logger from '@ulixee/commons/lib/Logger';
import DataboxForHero from '@ulixee/databox-for-hero';
import IDataboxObject from '@ulixee/databox-for-hero/interfaces/IDataboxObject';
import DataboxForHeroPlugin, { getDataboxForHeroPlugin } from '@ulixee/databox-for-hero/lib/DataboxForHeroPlugin';
import { createPromise } from '@ulixee/commons/lib/utils';
import { Helpers } from './index';

const { log } = Logger(module);

export const needsClosing: { close: () => Promise<any> | void; onlyCloseOnFinal?: boolean }[] = [];

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

interface IFullstackDatabox<TInput, TOutput> {
  databoxObject: IDataboxObject<TInput, TOutput>;
  databoxForHeroPlugin: DataboxForHeroPlugin<TInput, TOutput>;
  databoxClose: () => void;
}

export async function createFullstackDatabox<TInput, TOutput>(
  options: IDataboxForHeroExecOptions = {},
): Promise<IFullstackDatabox<TInput, TOutput>> {
  const bridge = new TransportBridge();
  Core.addConnection(bridge.transportToClient);
  options.connectionToCore = new ConnectionToHeroCore(bridge.transportToCore);
  
  let promiseResolve: () => void;
  let databoxObject: IDataboxObject<TInput, TOutput>;
  let databoxForHeroPlugin: DataboxForHeroPlugin<TInput, TOutput>;

  const readyPromise = createPromise<void>();
  const closedPromise = createPromise<void>();
 
  new DataboxForHero<TInput, TOutput>({ 
    run(databox) {
      databoxObject = databox;
      databoxForHeroPlugin = getDataboxForHeroPlugin(databox.hero);
      readyPromise.resolve();
      return closedPromise.promise;
    },
  }).exec(options).catch(error => console.log(error));

  function databoxClose() {
    closedPromise.resolve();
  }

  Helpers.needsClosing.push({ close: databoxClose });
  await readyPromise.promise;

  return { 
    databoxObject, 
    databoxForHeroPlugin, 
    databoxClose,
  }
}
