import Herobox from '@ulixee/herobox';

// configure input.url by running as node example.org.js --input.url="https://ulixee.org"

export default new Herobox(async herobox => {
  const { input, output, hero } = herobox;
  input.url ??= 'https://example.org';

  await hero.goto(input.url);
  const title = await hero.document.title;

  output.title = title;
  output.body = await hero.document.body.textContent;
  console.log(`LOADED ${input.url}: ${title}`);
  await hero.close();
});
