// NOTE: you must start your own Ulixee Cloud to run this example.

import { Crawler, Datastore, Runner, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

const datastore = new Datastore({
  crawlers: {
    hackernews: new Crawler(async ({ Hero }) => {
      const hero = new Hero();
      await hero.goto('https://news.ycombinator.com/');
      await hero.waitForPaintingStable();
      await hero.document.querySelector('#hnmain').$addToDetachedElements('table');

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
    }, HeroRunnerPlugin),
  },
  runners: {
    hackernews: new Runner(async ({ Output, HeroReplay }) => {
      const { detachedElements } = await HeroReplay.fromCrawler(datastore.crawlers.hackernews, {
        input: {
          maxTimeInCache: 24 * 60 * 60,
        },
      });
      const storyElement = await detachedElements.get('table');
      const stories = storyElement.querySelectorAll('.athing');
      for (const story of stories) {
        const extraElem = story.nextElementSibling;
        const record = new Output();

        const titleElem = story.querySelector('a.titlelink');

        record.score = parseInt(extraElem.querySelector('.score')?.textContent ?? '0', 10);
        record.id = story.getAttribute('id');
        record.age = extraElem.querySelector('.age a').textContent;
        record.subject = titleElem.textContent;
        const contributor = extraElem.querySelector('.hnuser')?.textContent ?? '';
        record.contributor = { id: contributor, username: contributor };
        const links = extraElem.querySelectorAll('.subtext > a');
        const commentsLink = links[links.length - 1];
        const commentText = commentsLink.textContent;
        record.commentCount = commentText.includes('comment')
          ? parseInt(commentText.trim().match(/(\d+)\s/)[0], 10)
          : 0;

        record.url = titleElem.getAttribute('href');
        record.emit();
      }
    }, HeroRunnerPlugin),
  },
});
export default datastore;
