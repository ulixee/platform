import * as WebSocket from 'ws';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import type IChromeAliveCore from '@ulixee/apps-chromealive-core';
import { sendWsCloseUnexpectedError, wsSend } from './WsUtils';
import Server from '../index';
import BaseCoreConnector from './BaseCoreConnector';

export default class ChromeAliveCoreConnector extends BaseCoreConnector {
  private readonly server: Server;

  constructor(server: Server) {
    super(server);
    server.addWsRoute('/chromealive', this.onConnection.bind(this));

    this.setServerAddress(server.address);
    this.server = server;
  }

  public close() {
    const ChromeAliveCore = ChromeAliveCoreConnector.getChromeAlive();
    ChromeAliveCore.shutdown();
  }

  public setServerAddress(address: Promise<string>): void {
    const ChromeAliveCore = ChromeAliveCoreConnector.getChromeAlive();
    const chromeAliveAddress = address.then(x => `ws://${x}/chromealive`);
    ChromeAliveCore.setCoreServerAddress(chromeAliveAddress);
  }

  private onConnection(ws: WebSocket) {
    const ChromeAliveCore = ChromeAliveCoreConnector.getChromeAlive();
    const connection = ChromeAliveCore.addConnection();
    ws.on('message', message => {
      const payload = TypeSerializer.parse(message.toString(), 'CLIENT');
      return connection.handleRequest(payload);
    });

    ws.once('close', () => connection.close());

    connection.on('message', async payload => {
      const json = TypeSerializer.stringify(payload);
      try {
        await wsSend(ws, json);
      } catch (error) {
        sendWsCloseUnexpectedError(ws, error.message);
      }
    });
  }

  public static isInstalled(): boolean {
    try {
      this.getChromeAlive();
      return true;
    } catch (err) {
      return false;
    }
  }

  private static getChromeAlive(): typeof IChromeAliveCore {
    // eslint-disable-next-line global-require
    return require('@ulixee/apps-chromealive-core').default;
  }
}
