// NOTE: you must start your own Ulixee Cloud to run this example.

import Datastore from '@ulixee/datastore';
import { Crawler, Extractor, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
import { number, object, string } from '@ulixee/schema';

const datastore = new Datastore({
  name: 'YC News',
  description: 'Gets the latest headlines from news.ycombinator.com',
  crawlers: {
    newsCrawler: new Crawler(
      {
        async run({ Hero }) {
          const hero = new Hero();
          await hero.goto('https://news.ycombinator.com/');
          await hero.waitForPaintingStable();
          const records = await hero.document.querySelectorAll('.athing');
          await records.$addToDetachedElements('titles');
          for (const record of records) {
            await record.nextElementSibling.$addToDetachedElements('subtitles');
          }

          const links = await hero.document.querySelectorAll('.subline > a[href^="item?"]');

          const lastStory = await links[(await links.length) - 1];

          if (lastStory) {
            await hero.click(lastStory);
            await hero.waitForLocation('change');
            await hero.waitForElement(hero.document.querySelector('textarea'));
            await hero.click(hero.document.querySelector('textarea'));
            await hero.type('Hackernews!');
            const comments = [...(await hero.document.querySelectorAll('.commtext'))];
            await hero.interact({
              move: comments[comments.length - 1],
            });
          }

          return hero;
        },
      },
      HeroExtractorPlugin,
    ),
  },
  extractors: {
    news: new Extractor(
      {
        async run({ Output, HeroReplay }) {
          const heroReplay = await HeroReplay.fromCrawler(datastore.crawlers.newsCrawler, {
            input: {
              maxTimeInCache: 24 * 60 * 60,
            },
          });
          const titles = await heroReplay.detachedElements.getAll('titles');
          const subtitles = await heroReplay.detachedElements.getAll('subtitles');
          for (let i = 0; i < titles.length; i += 1) {
            const story = titles[i];
            const extraElem = subtitles[i];

            const output = new Output();

            const titleElem = story.querySelector('.titleline > a');

            output.score = parseInt(extraElem.querySelector('.score')?.textContent ?? '0', 10);
            output.id = story.getAttribute('id');
            output.age = extraElem.querySelector('.age a').textContent;
            output.subject = titleElem.textContent;
            const contributor = extraElem.querySelector('.hnuser')?.textContent ?? '';
            output.contributor = { id: contributor, username: contributor };
            const links = extraElem.querySelectorAll('.subline > a');
            const commentsLink = links[links.length - 1];
            const commentText = commentsLink?.textContent;
            output.commentCount = commentText?.includes('comment')
              ? parseInt(commentText.trim().match(/(\d+)\s/)[0], 10)
              : 0;

            let url = titleElem.getAttribute('href');
            if (!url.includes('://')) url = new URL(url, 'https://news.ycombinator.com/').href;
            output.url = url;
            output.emit();
          }
        },
        schema: {
          output: {
            score: number(),
            id: string(),
            age: string(),
            subject: string(),
            contributor: object({
              id: string(),
              username: string(),
            }),
            commentCount: number(),
            url: string({ format: 'url' }),
          },
        },
      },
      HeroExtractorPlugin,
    ),
  },
});
export default datastore;
