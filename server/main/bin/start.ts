#!/usr/bin/env node

import '@ulixee/commons/lib/SourceMapSupport';
import Server from '../index';
import * as yargsParser from 'yargs-parser';
import ShutdownHandler from '@ulixee/commons/lib/ShutdownHandler';

(async () => {
  const args = yargsParser(process.argv);
  const server = new Server();

  ShutdownHandler.register(() => server.close());

  await server.listen({ port: args.port });
  const port = await server.port;
  const startMessage = `Ulixee Server v${server.version} is listening on port ${port}`;

  // eslint-disable-next-line no-console
  console.log(
    `\n----------------------------------------${startMessage}----------------------------------------\n`,
  );
})().catch(error => {
  console.error('ERROR starting core', { error });
  process.exit(1);
});
