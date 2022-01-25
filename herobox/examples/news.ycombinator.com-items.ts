import Herobox from '@ulixee/herobox';

export default new Herobox(async ({ hero }) => {
  await hero.goto('https://news.ycombinator.com/');
  await hero.waitForPaintingStable();
  const records = await hero.document.querySelectorAll('.athing');
  await records.$collect('titles');
  for (const record of records) {
    await record.nextElementSibling.$collect('subtitles');
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
}).extract(async ({ output, collectedFragments }) => {
  const titles = await collectedFragments.getAll('titles');
  const subtitles = await collectedFragments.getAll('subtitles');
  for (let i = 0; i < titles.length; i += 1) {
    const story = titles[i];
    const extraElem = subtitles[i];
    output.push({});
    const record = output[output.length - 1];

    const titleElem = story.querySelector('a.titlelink');

    record.score = parseInt(extraElem.querySelector('.score')?.textContent ?? '0', 10);
    record.id = story.firstElementChild.getAttribute('id');
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
  }
});
