import Server from '@ulixee/server';

(async function main() {
  const server = new Server();
  await server.listen({ port: 8080 });
  console.log(`Server started on port ${await server.port}`);
  return server;
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1)
});
