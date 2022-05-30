export default async function ({ hero, input, output }) {
  await hero.goto(input.url);
  await hero.waitForPaintingStable();
  output.title = await hero.document.title;
}
