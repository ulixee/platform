import { CloudNode } from '@ulixee/cloud';

(async function main() {
  const cloudNode = new CloudNode();
  await cloudNode.listen({ port: 8080 });
  console.log(`Cloud started on port ${await cloudNode.port}`);
  return cloudNode;
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1);
});
