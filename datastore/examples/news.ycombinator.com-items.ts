// NOTE: you must start your own Ulixee Miner to run this example.

import { Crawler, Function, HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';
import Datastore from '@ulixee/datastore';

const datastore = new Datastore({
  crawlers: {
    news: new Crawler(async ({ Hero }) => {
      const hero = new Hero();
      await hero.goto('https://news.ycombinator.com/');
      await hero.waitForPaintingStable();
      const records = await hero.document.querySelectorAll('.athing');
      await records.$addToDetachedElements('titles');
      for (const record of records) {
        await record.nextElementSibling.$addToDetachedElements('subtitles');
      }

      const links = await hero.document.querySelectorAll('.subtext > a');

      const lastStory = await links[(await links.length) - 1];

      if (lastStory) {
        await hero.click(lastStory);
        await hero.waitForLocation('change');
        await hero.waitForElement(hero.document.querySelector('textarea'));
        await hero.click(hero.document.querySelector('textarea'));
        await hero.type('Hackernews!');
        // const comments = [...(await hero.document.querySelectorAll('.commtext'))];
        // await hero.interact({
        //   move: comments[comments.length - 1],
        // });
      }

      return hero;
    }, HeroFunctionPlugin),
  },
  functions: {
    news: new Function(async ({ Output, HeroReplay }) => {
      const lastCrawl = await datastore.crawl('news', {
        maxTimeInCache: 24 * 60 * 60,
      });
      const heroReplay = new HeroReplay(lastCrawl);
      const titles = await heroReplay.detachedElements.getAll('titles');
      const subtitles = await heroReplay.detachedElements.getAll('subtitles');
      for (let i = 0; i < titles.length; i += 1) {
        const story = titles[i];
        const extraElem = subtitles[i];

        const output = new Output();

        const titleElem = story.querySelector('a.titlelink');

        output.score = parseInt(extraElem.querySelector('.score')?.textContent ?? '0', 10);
        output.id = story.firstElementChild.getAttribute('id');
        output.age = extraElem.querySelector('.age a').textContent;
        output.subject = titleElem.textContent;
        const contributor = extraElem.querySelector('.hnuser')?.textContent ?? '';
        output.contributor = { id: contributor, username: contributor };
        const links = extraElem.querySelectorAll('.subtext > a');
        const commentsLink = links[links.length - 1];
        const commentText = commentsLink.textContent;
        output.commentCount = commentText.includes('comment')
          ? parseInt(commentText.trim().match(/(\d+)\s/)[0], 10)
          : 0;

        output.url = titleElem.getAttribute('href');
        output.emit();
      }
    }, HeroFunctionPlugin),
  },
});
export default datastore;
