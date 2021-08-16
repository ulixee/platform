import Server from '@ulixee/server';

(async () => {
  const server = new Server();
  await server.listen({ port: 8080 });
  return server;
  console.log(`Server started on port ${await server.port}`);
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1)
});
