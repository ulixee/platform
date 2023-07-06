<template>
  <MainLayout>
    <h1 class="text-3xl font-light uppercase">How to contribute</h1>

    <blockquote class="border-l-4 my-5 border-slate-300 pl-5">
      Ulixee is an open-source project built by core maintainers and contributors. We want to make
      it easy for anyone to participate. Contribute to our Apps, Cloud, Datastore, Stream, Hero,
      improve documentation or improve detections and evasions in the
      <a href="https://github.com/ulixee">Unblocked project</a>. It all helps Ulixee on its
      mission to create a data economy.
    </blockquote>

    <p>Read the <a href="/code-of-conduct">code of conduct </a>.</p>

    <h2>Contributing to the Code</h2>

    <p>
      Ulixee uses a **monorepo** pattern to manage its tools. To contribute, you'll probably want to
      to setup the Ulixee repository locally.
    </p>

    <h3>Setting Up the Ulixee Repository</h3>

    <p>
      Install <a href="https://nodejs.org/en/download/">Node.js 16</a> or higher and
      <a href="https://yarnpkg.com/lang/en/docs/install/">Yarn</a>.
    </p>

    <ol>
      <li>
        Clone the `https://github.com/ulixee/platform.git` repository with --recursive (to ensure it
        installs submodules).
      </li>
    </ol>

    <p>
      **Yarn** will add dependencies from your test projects to the root `yarn.lock` file. So you
      should not commit changes in that file unless you have added dependencies to any of the core
      packages. If you need to commit it, remove your projects from the `~/projects` folder
      temporary and run `yarn` in the root folder. Yarn will then clean up the lock file with only
      core dependencies. Commit the file and move your projects back and run `yarn` again to start
      developing.
    </p>

    <h2>Contributing to the docs</h2>

    <p>
      We are a strong believer that documentation is very important for any open-source projects.
    </p>

    <p>
      Every project in Ulixee has a `/docs` folder. If you want to add/modify any documentation,
      you can go any of these folders on
      <a href="https://github.com/ulixee/platform">GitHub</a> (eg,
      <a href="https://github.com/ulixee/platform/tree/main/datastore/docs">Datastore docs</a>) and use
      the file editor to edit and then preview your changes.
    </p>
    <p>
      GitHub then allows you to commit the change and raise a PR right in the UI. This is the
      _easiest_ way you can contribute.
    </p>

    <p>
      You can also clone <a href="https://github.com/ulixee/platform">the Ulixee monorepo</a> and work
      locally on documentation.
    </p>
  </MainLayout>
</template>

<style lang="scss" scoped>
h2 {
  @apply text-xl font-bold mb-3;
}
h3 {
  @apply font-bold mb-3;
}
p {
  @apply mb-5;
}
</style>
