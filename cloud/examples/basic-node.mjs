import { CloudNode } from '@ulixee/cloud';

(async () => {
  const cloudNode = await CloudNode.start();
  console.log(`Cloud started on port ${await cloudNode.port}`);
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1)
});
