module.exports = {
  outputDir: '../../build/apps/chromealive/ui',
  pages: {
    toolbar: {
      entry: './src/pages/toolbar/index.ts',
    },
    'menu-finder': {
      entry: './src/pages/menu-finder/index.ts',
    },
    'menu-primary': {
      entry: './src/pages/menu-primary/index.ts',
    },
    'menu-timetravel': {
      entry: './src/pages/menu-timetravel/index.ts',
    },
    'menu-url': {
      entry: './src/pages/menu-url/index.ts',
    },
    'screen-input': {
      title: 'Input Configuration',
      entry: './src/pages/screen-input/index.ts',
    },
    'screen-output': {
      title: 'Output',
      entry: './src/pages/screen-output/index.ts',
    },
    'screen-reliability': {
      title: 'Reliability Testing',
      entry: './src/pages/screen-reliability/index.ts',
    },
    'screen-about': {
      entry: './src/pages/screen-about/index.ts',
    },
  },
};
