module.exports = {
  titleTemplate: 'Ulixee - The Scraping Toolkit',
  siteUrl: 'https://ulixee.org',
  pathPrefix: '/',
  outputDir: '../build-dist/website',
  templates: {},
  chainWebpack: config => {
    const svgRule = config.module.rule('svg');
    svgRule.uses.clear();
    svgRule.use('vue-svg-loader').loader('vue-svg-loader');
  },
  plugins: [
    {
      use: 'gridsome-plugin-pug',
      options: {
        pug: {
          /* Options for `pug-plain-loader` */
        },
        pugLoader: {
          /* Options for `pug-loader` */
        },
      },
    },
    {
      use: 'gridsome-plugin-typescript',
    },
    {
      use: '@gridsome/vue-remark',
      options: {
        baseDir: '../hero/docs/main',
        pathPrefix: '/docs/hero',
        typeName: 'HeroDocs',
        editingDomain: 'https://github.com/ulixee/hero/tree/main/docs/main',
        template: './src/templates/HeroDoc.vue',
        plugins: ['@gridsome/remark-prismjs'],
        remark: {
          autolinkHeadings: {
            content: {
              type: 'text',
              value: '#',
            },
          },
        },
      },
    },
    {
      use: '@gridsome/vue-remark',
      options: {
        baseDir: '../server/docs',
        pathPrefix: '/docs/server',
        typeName: 'ServerDocs',
        editingDomain: 'https://github.com/ulixee/ulixee/tree/main/server/docs',
        template: './src/templates/ServerDoc.vue',
        plugins: ['@gridsome/remark-prismjs'],
        remark: {
          autolinkHeadings: {
            content: {
              type: 'text',
              value: '#',
            },
          },
        },
      },
    },
  
    {
      use: '@gridsome/vue-remark',
      options: {
        baseDir: '../databox/docs',
        pathPrefix: '/docs/databox',
        typeName: 'DataboxDocs',
        editingDomain: 'https://github.com/ulixee/ulixee/tree/main/databox/docs',
        template: './src/templates/DataboxDoc.vue',
        plugins: ['@gridsome/remark-prismjs'],
        remark: {
          autolinkHeadings: {
            content: {
              type: 'text',
              value: '#',
            },
          },
        },
      },
    },
    {
      use: '@gridsome/vue-remark',
      options: {
        baseDir: '../hero/docs/awaited-dom',
        pathPrefix: '/docs/awaited-dom',
        typeName: 'AwaitedDom',
        template: './src/templates/AwaitedDomDocsPage.vue',
        plugins: ['@gridsome/remark-prismjs'],
        remark: {
          autolinkHeadings: {
            content: {
              type: 'text',
              value: '#',
            },
          },
        },
      },
    },
    {
      use: '@gridsome/vue-remark',
      options: {
        baseDir: './blog',
        pathPrefix: '/blog',
        typeName: 'Post',
        template: './src/templates/BlogPost.vue',
        plugins: ['@gridsome/remark-prismjs'],
        remark: {
          autolinkHeadings: {
            content: {
              type: 'text',
              value: '#',
            },
          },
        },
      },
    },
    {
      use: '@microflash/gridsome-plugin-feed',
      options: {
        contentTypes: ['Post'],
        feedOptions: {
          title: 'Ulixee Blog',
          description: 'A blog about scraping, features and experiences developing Ulixee',
        },
        rss: {
          enabled: true,
          output: '/feed.xml',
        },
        atom: {
          enabled: true,
          output: '/feed.atom',
        },
        json: {
          enabled: true,
          output: '/feed.json',
        },
      },
    },
  ],
};
