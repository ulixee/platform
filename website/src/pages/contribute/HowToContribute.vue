<template>
   <MainLayout>
      <h1>How to contribute</h1>

      <blockquote>Hero is an open-source project built by core maintainers and contributors. We want to make it easy for anyone to participate. Contribute to core, build plugins, improve documentation or improve detection evasions. It all helps Hero on its mission to keep the web easily scriptable.</blockquote>

      <p>Read the [code of conduct](./code-of-conduct).</p>

      <h2>Contributing to the Code</h2>

      <p>Hero uses a **monorepo** pattern to manage its dependencies and core plugins. To contribute, you'll probably want to to setup the Hero repository locally.</p>

      <h3>Setting Up the Hero Repository</h3>

      <p>Install [Node.js 14](https://nodejs.org/en/download/) or higher and [Yarn](https://yarnpkg.com/lang/en/docs/install/).</p>

      <ol>
         <li>Clone the `https://github.com/ulixee/hero.git` repository.</li>
      </ol>

      <p>**Yarn** will add dependencies from your test projects to the root `yarn.lock` file. So you should not commit changes in that file unless you have added dependencies to any of the core packages. If you need to commit it, remove your projects from the `~/projects` folder temporary and run `yarn` in the root folder. Yarn will then clean up the lock file with only core dependencies. Commit the file and move your projects back and run `yarn` again to start developing.</p>

      <h2>Contributing to the docs</h2>

      <p>We are a strong believer that documentation is very important for any open-source projects. Hero uses Gridsome for its website and documentation.</p>

      <ol>
         <li>
            If you want to add/modify any Hero documentation, go to the
            [docs folder on GitHub](https://github.com/ulixee/hero/tree/main/docs/main) and
            use the file editor to edit and then preview your changes.
         </li>
         <li>GitHub then allows you to commit the change and raise a PR right in the UI. This is the _easiest_ way you can contribute to Hero!</li>
      </ol>

      <p>You can also clone [the Hero repo](https://github.com/ulixee/hero) and work locally on documentation.</p>
   </MainLayout>
</template>