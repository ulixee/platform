import { CloudNode } from '@ulixee/cloud';

(async function main() {
  const cloudNode = new CloudNode({ listenOptions: { publicPort: 8080 } });
  await cloudNode.listen();
  console.log(`Cloud started on port ${await cloudNode.port}`);
  return cloudNode;
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1);
});
