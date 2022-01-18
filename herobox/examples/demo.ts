import Herobox from '../index';

export default new Herobox(async ({ hero }) => {
  await hero.goto('https://www.kayak.com');
  await hero.waitForPaintingStable();

  await hero.goto('https://www.kayak.com/flights');
  await hero.waitForPaintingStable();
});
