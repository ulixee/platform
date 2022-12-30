# Databox for Hero

Databox for Hero is a simple wrapper for your Hero scraper script that converts it into a discrete, composable, and deployable unit.

- [x] **Production Proof Your Script** - Production proof your script a thousand different ways.
- [x] **Breaking Notifications** - Get notified when your scripts break.
- [x] **Runs Anywhere** - Containerize your scripts to run everywhere
- [x] **Works with Chrome Alive!** - Progressively build your scripts with Chrome Alive!
- [x] **Easy Management** - Manage your databoxes like a boss.

## Installation

```shell script
npm install @ulixee/databox-plugins-hero
```

or

```shell script
yarn add @ulixee/databox-plugins-hero
```

## Usage

Wrapping your script in a Databox gives it instant access to the input and output objects, along with a Hero instance:

script.ts

```js
const Databox = require('@ulixee/databox-plugins-hero');

new Databox(async databox => {
  const { input, Output, Hero } = databox;
  const hero = new Hero();
  await hero.goto('https://example.org');
  Output.emit({ text: `I went to example.org. Your input was: ${input.params.name}` });
});
```

You can call your script in several ways.

1. Directly from the command line:

```shell script
% node script.js --params.name=Alfonso
```

2. Through Stream:

**COMING SOON**

```js
import Stream from '@ulixee/stream';

const stream = new Stream('');

const output = await stream.query({ params: { name: 'Alfonso' } });
```

Browse the [full API docs](https://docs.ulixee.org/databox).

## Contributing

We'd love your help making `Databox for Hero` a better tool. Please don't hesitate to send a pull request.

## License

[MIT](LICENSE.md)
