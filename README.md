# Ulixee

Ulixee is a scraping [engine][hero] with a built-in deployment [unit][databox] that enables out-of-the-box [querying][stream] across a horizontal [deployment][miner].

This repository is the development home to several of the tools that make it easy to build and manage these scripts, including [ChromeAlive!](apps/chromealive), [Miner][miner] and [Databox][databox].

## Projects

- Hero `/hero`. The Automated Browser Engine built for scraping. (repository home - https://github.com/ulixee/hero).
- Databox `/databox`. Discrete, composable units for interconnected data extraction scripts.
- Miner `/miner`. Run Ulixee tooling on a remote machine.
- Stream `/stream`. Query, transform and compose Databoxes running on any machine.
- ChromeAlive! `/apps/chromealive*`. Supercharge scraper script development using the Chrome browser.

## Tooling

Try out Ulixee Desktop! The Alpha release is available for download under [Assets](https://github.com/ulixee/platform/releases/latest).

### Docker

We publish a Docker image of the latest Ulixee Miner to:
- Github Container Registry: `docker pull ghcr.io/ulixee/ulixee-miner && docker tag ghcr.io/ulixee/ulixee-miner ulixee/ulixe-miner`
- DockerHub: `docker pull ulixee/ulixee-miner`

To use the image, we have a [run.sh](./miner/tools/docker/run.sh) script that will run with a non-root user on your choice of port. All environmental configurations are listed [here](./miner/main/.env.defaults).

## Developer Environment

This project serves as a Monorepo for developing the Ulixee Apps, Hero, Databox and Miner. To install this project, you'll need to:

1. Clone with `--recursive` so that submodules are initialized.
2. Run `yarn build:all` from the main repository.

Learn more about Ulixee at [ulixee.org](https://ulixee.org).

## Contributing

See [How to Contribute](https://ulixee.org/how-to-contribute) for ways to get started.

This project has a [Code of Conduct](https://ulixee.org/code-of-conduct). By interacting with this repository, organization, or community you agree to abide by its terms.

We'd love your help in making Ulixee a better set of tools. Please don't hesitate to send a pull request.

## License

[MIT](LICENSE.md)

[hero]: https://github.com/ulixee/hero
[databox]: databox
[stream]: ./
[miner]: miner
