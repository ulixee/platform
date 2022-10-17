import DataboxForHero from '@ulixee/databox-for-hero';

export default new DataboxForHero(async ({ hero, input, output }) => {
  await hero.goto(input.url);
  await hero.waitForPaintingStable();
  output.title = await hero.document.title;
});
