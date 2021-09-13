import '@ulixee/commons/lib/SourceMapSupport';
import Server from '@ulixee/server';
import * as yargsParser from 'yargs-parser';
import { ShutdownHandler } from '@ulixee/commons/lib/ShutdownHandler';

(async () => {
  const args = yargsParser(process.argv);
  const server = new Server();

  ShutdownHandler.exitOnSignal = false;
  ShutdownHandler.register(() => server.close());

  await server.listen({ port: args.port ?? 0 });
  const startMessage = `Ulixee Server is listening on port ${await server.port}\nhttp://${await server.address}`;

  // eslint-disable-next-line no-console
  console.log(
    `\n----------------------------------------${startMessage}----------------------------------------\n`,
  );
})().catch(error => {
  console.error('ERROR starting core', { error });
  process.exit(1);
});
