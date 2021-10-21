const pages = {}

const outputDir = '../../build/apps/chromealive/extension';
const chromeName = ['selector-generator']

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
