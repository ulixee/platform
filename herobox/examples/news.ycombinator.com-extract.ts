import Herobox from '@ulixee/herobox';

export default new Herobox(async ({ hero }) => {
  await hero.goto('https://news.ycombinator.com/');
  await hero.waitForPaintingStable();
  await hero.document.querySelector('#hnmain').$extractLater('table');

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
}).extract(async ({ output, collectedFragments }) => {
  const stories = collectedFragments.get('table').querySelectorAll('.athing');
  for (const story of await stories) {
    const extraElem = await story.nextElementSibling;
    output.push({});
    const record = output[output.length - 1];

    const titleElem = await story.querySelector('a.titlelink');

    record.score = parseInt(
      await extraElem.querySelector('.score').textContent.catch(() => '0'),
      10,
    );
    record.id = await story.getAttribute('id');
    record.age = await extraElem.querySelector('.age a').textContent;
    record.subject = await titleElem.textContent;
    const contributor = await extraElem.querySelector('.hnuser').textContent.catch(() => '');
    record.contributor = { id: contributor, username: contributor };
    const links = [...(await extraElem.querySelectorAll('.subtext > a'))];
    const commentsLink = links[links.length - 1];
    const commentText = await commentsLink.textContent;
    record.commentCount = commentText.includes('comment')
      ? parseInt(commentText.trim().match(/(\d+)\s/)[0], 10)
      : 0;

    record.url = await titleElem.getAttribute('href');
  }
});
