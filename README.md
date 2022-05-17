# Ulixee

Ulixee is a scraping [engine][hero] with a built-in deployment [unit][databox] that enables out-of-the-box [querying][stream] across a horizontal [deployment][server].

This repository is the development home to several of the tools that make it easy to build and manage these scripts, including [ChromeAlive!](apps/chromealive), [Server][server] and [Databox for Hero][databox].

## Projects

- Hero `/hero`. The Automated Browser Engine built for scraping. (repository home - https://github.com/ulixee/hero).
- Databox for Hero `/databox/for-hero`. A discrete, composable unit for data extraction scripts.
- Server `/server`. Run Ulixee tooling on a remote machine.
- Stream `/stream`. Query, transform and compose Databoxes running on any machine.
- ChromeAlive! `/apps/chromealive*`. Supercharge scraper script development using the Chrome browser.

## Tooling

Try out Ulixee Desktop! The Alpha release is available for download under [Assets](https://github.com/ulixee/ulixee/releases/latest).

## Developer Environment

This project serves as a Monorepo for developing the Ulixee Apps, Hero, Databox and Server. To install this project, you'll need to:

1. Clone with `--recursive` so that submodules are initialized.
2. Run `yarn build:all` from the main repository.

Learn more about Ulixee at [ulixee.org](https://ulixee.org).

## Contributing

See [how-to-contribute.md](server/docs/Contribute/how-to-contribute.md) for ways to get started.

This project has a [code of conduct](server/docs/Contribute/code-of-conduct.md). By interacting with this repository, organization, or community you agree to abide by its terms.

We'd love your help in making Ulixee a better set of tools. Please don't hesitate to send a pull request.

## License

[MIT](LICENSE.md)

[hero]: https://github.com/ulixee/hero
[databox]: ./databox/for-hero
[stream]: ./stream
[server]: ./server
