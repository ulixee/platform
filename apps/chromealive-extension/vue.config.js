const path = require('path');
const pages = {}

const outDir = process.env.BUILD_DIR ?? 'build'
const outputDir = path.resolve(__dirname, path.join('../..', outDir, 'apps/chromealive-core/extension'));
const chromeName = ['hero-script', 'state-generator']

chromeName.forEach(name => {
  pages[name] = {
    entry: `src/pages/${name}/index.ts`,
    template: 'public/index.html',
    filename: `${name}.html`
  }
})

module.exports = {
  pages,
  filenameHashing: false,
  outputDir: outputDir,
}
