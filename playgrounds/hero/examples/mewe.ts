const Hero = require('@ulixee/hero-playground');

(async () => {
  const hero = new Hero({
    showChrome: true,
    showChromeInteractions: true,
    showChromeAlive: false,
  });
  try {
    await hero.goto('https://www.mewe.com/login');

    // await hero.document.querySelector("#login-fake-btn").$click();
    // await hero.activeTab.waitForLoad("AllContentLoaded");
    // console.log("por aca que onda");

    await hero.waitForState({
      name: 'form_ready',
      all(assert) {
        assert(hero.isPaintingStable);
        // assert(hero.isAllContentLoaded);
        assert(hero.isAllContentLoaded);
        // assert(hero.document.querySelector("#login-fake-btn").$isClickable);
        assert(hero.document.querySelector('#email').$isClickable);
        assert(hero.document.querySelector('#password').$isClickable);
      },
    });

    await hero.interact(
      //   { click: hero.document.querySelector("#login-fake-btn") },
      { click: hero.document.querySelector('#email') },
      { type: 'miguel.pallardo@outlook.es' },
      { click: hero.document.querySelector('#password') },
      { type: 'trendiT-30' },
      { click: hero.document.querySelector("form button[type='submit']") },
    );
    await hero.waitForMillis(60 * 1000);
  } finally {
    console.log(hero.meta);
    await hero.close();
  }
})();
