import Herobox from '../index';

export default new Herobox(async herobox => {
  const { hero } = herobox;
  await hero.goto('https://ulixee.org');
  const state = await hero.waitForPageState({
    // default: ({ loadFrom }) =>
    //   loadFrom('@/pagestate/8f9ad51925801787abfde70013c7cb53/koL6ERf67__fkfwIy3RQc.json'),
  });
  //
  // await hero.click(hero.document.querySelector('.search-form input'));
  // await hero.type('flights');
  // await hero.type(KeyboardKey.Enter);
  //
  // const page2 = await hero.waitForPageState({
  //   "default": ({ loadFrom }) => loadFrom("@/pagestate/d92ae117998699589b5a4f321a26db42/dim_8KCb31DsGmLl3dIUl.json"),
  // });
});
