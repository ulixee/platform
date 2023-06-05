// NOTE: you must start your own Ulixee Cloud to run this example.

import { Datastore, Extractor, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';
import { number, object, string } from '@ulixee/schema';

export default new Datastore({
  name: 'Hackernews',
  description: 'Collect all the top stories from news.ycombinator.com',
  extractors: {
    latest: new Extractor(
      {
        async run({ Hero, Output }) {
          const hero = new Hero();
          await hero.goto('https://news.ycombinator.com/');
          await hero.waitForPaintingStable();

          const stories = await hero.document.querySelectorAll('.athing');
          let lastStory;

          for (const story of stories) {
            const extraElem = await story.nextElementSibling;
            const record = new Output();

            const titleElem = story.querySelector('.titleline > a');

            record.score = parseInt(
              await extraElem.querySelector('.score').textContent.catch(() => '0'),
              10,
            );
            record.id = await story.getAttribute('id');
            record.age = await extraElem.querySelector('.age a').textContent;
            record.title = await titleElem.textContent;
            const contributor = await extraElem
              .querySelector('.hnuser')
              .textContent.catch(() => '');
            record.contributor = { id: contributor, username: contributor };

            const links = [...(await extraElem.querySelectorAll('.subtext > a'))];
            const commentsLink = links[links.length - 1];
            const commentText = await commentsLink.textContent;
            record.commentCount = commentText.includes('comment')
              ? parseInt(commentText.trim().match(/(\d+)\s/)[0], 10)
              : 0;

            lastStory = commentsLink;
            let url = await titleElem.getAttribute('href');
            if (!url.includes('://')) url = new URL(url, 'https://news.ycombinator.com/').href;
            record.url = url;
            record.emit();
          }

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

          await hero.close();
        },
        schema: {
          output: {
            score: number(),
            id: string(),
            age: string(),
            title: string(),
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
