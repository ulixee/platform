import Server from '@ulixee/server';

(async () => {
  const server = await Server.start();
  console.log(`Server started on port ${await server.port}`);
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1)
});
