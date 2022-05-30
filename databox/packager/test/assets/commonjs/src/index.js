const Databox = require('@ulixee/databox-for-hero');
const { testFunction } = require('./helper');

module.exports = new Databox({
  async run(databox) {
    const { hero, output } = databox;
    output.text = testFunction();
    await hero.close();
  },
});
