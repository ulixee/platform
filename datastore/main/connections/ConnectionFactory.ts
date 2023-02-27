import Log from '@ulixee/commons/lib/Logger';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';
import UlixeeHostsConfig from '@ulixee/commons/config/hosts';
import { WsTransportToCore } from '@ulixee/net';
import ConnectionToDatastoreCore from './ConnectionToDatastoreCore';

const { version } = require('../package.json');

const { log } = Log(module);

export default class ConnectionFactory {
  public static hasLocalCloudPackage = false;

  public static createConnection(): ConnectionToDatastoreCore {
    let connection: ConnectionToDatastoreCore;
    const host = UlixeeHostsConfig.global.getVersionHost(version);

    if (host) {
      const transport = new WsTransportToCore(`${host}/datastore`);
      connection = new ConnectionToDatastoreCore(transport, { version });
    } else if (UlixeeHostsConfig.global.hasHosts()) {
      if (this.hasLocalCloudPackage) {
        // If Clouds are launched, but none compatible, propose installing Ulixee Cloud locally
        throw new Error(
          `A local Ulixee Cloud is not started. From your project, run:\n\nnpx @ulixee/cloud start`,
        );
      }

      // If Clouds are launched, but none compatible, propose installing cloudNode locally
      throw new Error(`Your script is using version ${version} of Datastore. A compatible Datastore Core was not found on localhost. You can fix this by installing and running a local Ulixee Cloud in your project:

npm install --save-dev @ulixee/cloud

npx @ulixee/cloud start
      `);
    }

    if (!connection) {
      throw new Error(
        'Datastore Core could not be found locally\nIf you meant to connect to a remote host, include the "host" parameter for your connection',
      );
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const onError = (error: Error) => {
      if (error) {
        log.error('Error connecting to core', {
          error,
          sessionId: null,
        });
      }
    };

    connection.connect(true).then(onError).catch(onError);
    ShutdownHandler.register(() => connection.disconnect());

    return connection;
  }
}
try {
  require.resolve('@ulixee/cloud');
  ConnectionFactory.hasLocalCloudPackage = true;
} catch (error) {
  /* no-op */
}
