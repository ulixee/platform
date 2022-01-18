import Hero from '@ulixee/hero';
import Herobox from '@ulixee/herobox';
import { KeyboardKey } from '@ulixee/hero-interfaces/IKeyboardLayoutUS';

export default new Herobox(async databox => {
  const { input, output, hero } = databox;
  input.url ??= 'https://www.kakak.com';

  await hero.goto(input.url);
  await hero.waitForPaintingStable();
  let url = await hero.url;

  while (!url.includes('kayak.com')) {
    await hero.waitForLocation('change');
    await hero.waitForPaintingStable();
    url = await hero.url;
  }

  const { document } = hero;
  url = await hero.url;
  if (!url.includes('/flights')) {
    await document.querySelector("a[href='/flights']").$click();
    await hero.waitForLocation('change');
    await hero.waitForPaintingStable();
  }

  const form = await document.querySelector(
    '.Ui-Searchforms-Flights-Components-FlightSearchForm-container',
  );
  const origin = await form.querySelector('div[class$="origin"]');
  await origin.$click();
  await hero.type(KeyboardKey.Backspace, KeyboardKey.Backspace, KeyboardKey.Backspace);
  await hero.type('San Francisco');
});
