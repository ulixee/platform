import Miner from '@ulixee/miner';

(async function main() {
  const miner = new Miner();
  await miner.listen({ port: 8080 });
  console.log(`Miner started on port ${await miner.port}`);
  return miner;
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1)
});
