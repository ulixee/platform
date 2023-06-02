import Hero from '@ulixee/hero';

(async () => {
  const hero = new Hero({ connectionToCore: 'ws://localhost:1818' });
  await hero.goto('https://ycombinator.com');
  const title = await hero.document.title;
  console.log('loaded -> ', title);
  await hero.close();
})().catch(error => {
  console.log('ERROR starting core', error);
  process.exit(1);
});
