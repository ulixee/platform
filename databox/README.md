# Databox for Hero

Databox for Hero is a simple wrapper for your Hero scraper script that converts it into a discrete, composable, and deployable unit. 

- [x] **Production Proof Your Script** - Production proof your script a thousand different ways.
- [x] **Breaking Notifications** - Get notified when your scripts break.
- [x] **Runs Anywhere** - Containerize your scripts to run everywhere
- [x] **Works with Chrome Alive!** - Progressively build your scripts with Chrome Alive!
- [x] **Easy Management** - Manage your databoxes like a boss.

Check out our [website](https://docs.ulixee.org/databox) for more details.

## Installation

```shell script
npm install @ulixee/databox-for-hero
```

or

```shell script
yarn add @ulixee/databox-for-hero
```

## Usage

Wrapping your script in a Databox gives it instant access to the input and output objects: 

script.ts
```js
const Databox = require('@ulixee/databox-for-hero');

new Databox(databox => {
  const { input, output } = databox;
  output.data = `My name is ${input.params.name}`;
});
```

You can call your script in several ways.

1) Directly from the command line:

```shell script
% node script.js --params.name=Alfonso
```

2) Through the Ulixee CLI:

__ COMING SOON __

```shell script
% ulixee databox run script.js --params.name=Alfonso
```

Through Stream:

__ COMING SOON __

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
