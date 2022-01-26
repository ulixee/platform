import Databox from '@ulixee/databox';

export default new Databox(async ({ hero }) => {
  await hero.goto('https://www.kayak.com');
  await hero.waitForPaintingStable();

  await hero.goto('https://www.kayak.com/flights');
  await hero.waitForPaintingStable();
});
