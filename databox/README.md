# Ulixee Databox

Databox is a simple wrapper for your scraper script that converts it into a discrete, composable, and deployable unit. 

- [x] **Production Proof Your Script** - Production proof your script a thousand different ways.
- [x] **Breaking Notifications** - Get notified when your scripts break.
- [x] **Runs Anywhere** - Containerize your scripts to run everywhere
- [x] **Works with Chrome Alive!** - Progressively build your scripts with chrome alive!
- [x] **Easy Management** - Manage your databoxes like a boss.

Check out our [website for more details](https://ulixee.org/databox).

## Installation

```shell script
npm install @ulixee/databox
```

or

```shell script
yarn add @ulixee/databox
```

## Usage

Wrapping your script in a Databox gives it instant access to the input and output objects: 

script.ts
```js
const Databox = require('@ulixee/databox');

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

```shell script
% ulixee databox run script.js --params.name=Alfonso
```

Through Runner:

```js
import Runner from '@ulixee/runner';

const runner = new Runner('');

const output = await runner.run({ params: { name: 'Alfonso' } });
```

Browse the [full API docs](https://ulixee.org/docs/databox).

## Contributing

We'd love your help in making Databox a better tool. Please don't hesitate to send a pull request.

## License

[MIT](LICENSE.md)
