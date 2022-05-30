# How to contribute

> Ulixee is an open-source project built by core maintainers and contributors. We want to make it easy for anyone to participate. Contribute to core, build plugins, improve documentation or write a blog post. It all helps Ulixee on its mission to keep the web open for innovation.

Read the [code of conduct](./code-of-conduct).

## Contributing to the Code

Ulixee uses a **monorepo** pattern to manage its sub-projects. To contribute, you'll probably want to to setup the Ulixee repository locally.

### Setting Up the Ulixee Repository

Install [Node.js 14](https://nodejs.org/en/download/) or higher and [Yarn](https://yarnpkg.com/lang/en/docs/install/).

1. Clone the `https://github.com/ulixee/ulixee.git` repository.

**Yarn** will add dependencies from your test projects to the root `yarn.lock` file. So you should not commit changes in that file unless you have added dependencies to any of the core packages. If you need to commit it, remove your projects from the `~/projects` folder temporary and run `yarn` in the root folder. Yarn will then clean up the lock file with only core dependencies. Commit the file and move your projects back and run `yarn` again to start developing.

## Contributing to the docs

We are a strong believer that documentation is very important for any open-source projects. Ulixee uses Gridsome for its documentation.

1. If you want to add/modify any Databox documentation, go to the
   [docs folder on GitHub](https://github.com/ulixee/ulixee/tree/databox/docs) and
   use the file editor to edit and then preview your changes.
2. GitHub then allows you to commit the change and raise a PR right in the UI. This is the _easiest_ way you can contribute to Ulixee!

You can also clone [the Ulixee repo](https://github.com/ulixee/ulixee) and work locally on documentation.