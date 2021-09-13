import * as WebSocket from 'ws';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import Log from '@ulixee/commons/lib/Logger';
import Core from '@ulixee/databox-core';
import { isWsOpen, wsSend } from './WsUtils';
import Server from '../index';
import BaseCoreConnector from './BaseCoreConnector';

const CLOSE_UNEXPECTED_ERROR = 1011;
const { log } = Log(module);

export default class DataboxCoreConnector extends BaseCoreConnector {
  private readonly server: Server;

  constructor(server: Server) {
    super(server);
    server.addWsRoute('/databox', this.handleDataboxScript.bind(this));
    this.server = server;
  }

  public async close() {
    await Core.shutdown();
  }

  private handleDataboxScript(ws: WebSocket) {
    const connection = Core.addConnection();
    ws.on('message', message => {
      const payload = TypeSerializer.parse(message.toString(), 'CLIENT');
      return connection.handleRequest(payload);
    });

    ws.once('close', () => connection.disconnect());
    ws.once('error', error => connection.disconnect(error));

    connection.on('message', async payload => {
      const json = TypeSerializer.stringify(payload);
      try {
        await wsSend(ws, json);
      } catch (error) {
        if (connection.isClosing === false) {
          log.error('Error sending message', {
            error,
            payload,
            sessionId: null,
          });
        }
        if (isWsOpen(ws)) {
          ws.close(CLOSE_UNEXPECTED_ERROR, JSON.stringify({ message: error.message }));
        }
      }
    });
  }
}
