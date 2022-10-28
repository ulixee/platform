import Miner from '@ulixee/miner';

(async () => {
  const miner = await Miner.start();
  console.log(`Miner started on port ${await miner.port}`);
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1)
});
