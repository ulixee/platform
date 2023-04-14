import Datastore, { Crawler, Runner } from '@ulixee/datastore';
import { HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';
import { array, boolean, object, string } from '@ulixee/schema';

const datastore = new Datastore({
  name: 'Ulixee Docs',
  description: `A Datastore to read and explore the Ulixee documentation.`,
  crawlers: {
    pageCrawler: new Crawler(
      {
        description: `This crawler emits all links in the sidebar as a detachedElement called 'sidebar-links', and the docs content as a detachedElement called 'content'.`,
        async run({ input, Hero }) {
          const hero = new Hero();
          await hero.goto(input.url);

          await hero.querySelector('.LEFTBAR').$waitForVisible();
          await hero.querySelectorAll('.LEFTBAR a').$addToDetachedElements('sidebar-links');
          await hero.querySelector('.post').$addToDetachedElements('content');

          return hero;
        },
        schema: {
          input: {
            url: string({ format: 'url' }),
          },
          inputExamples: [{ url: 'https://ulixee.org/docs/hero/advanced-client/tab' }],
        },
      },
      HeroRunnerPlugin,
    ),
    searchCrawler: new Crawler(
      {
        description: `This crawler allows you to search the docs, and emits the div containing search results as a Detached Element called 'results'.`,
        async run({ input, Hero }) {
          const hero = new Hero();
          await hero.goto(`https://ulixee.org/docs/hero`);

          const searchIcon = await hero.xpathSelector(`//*[.="search"]`).$waitForExists();
          await searchIcon.parentElement.$click();

          const searchInput = await hero.querySelector('#search-input').$waitForVisible();
          await searchInput.$type(input.query);

          const results = await hero.querySelector('.ds-suggestions').$waitForVisible();

          await results.$addToDetachedElements('results');

          return hero;
        },
        schema: {
          input: {
            query: string(),
          },
        },
      },
      HeroRunnerPlugin,
    ),
  },
  runners: {
    allPages: new Runner(
      {
        description: `Get all documentation pages for a given tool in the Ulixee suite.`,
        async run({ input, Output, HeroReplay }) {
          const url = `https://ulixee.org/docs/${input.tool}`;
          const hero = await HeroReplay.fromCrawler(datastore.crawlers.pageCrawler, {
            input: {
              url,
              maxTimeInCache: 60 * 60 * 24,
            },
          });
          const links = await hero.detachedElements.getAll('sidebar-links');

          for (const link of links) {
            Output.emit({
              name: link.textContent?.trim(),
              link: new URL((link as any).href, url).href,
            });
          }
        },
        schema: {
          input: {
            tool: string({ enum: ['hero', 'datastore', 'cloud', 'client'] }),
          },
          output: {
            link: string({ format: 'url' }),
            name: string(),
          },
        },
      },
      HeroRunnerPlugin,
    ),
    getDocumentation: new Runner(
      {
        description: `Get all documented methods, properties and the associated descriptions for a page of the Ulixee documentation.`,
        async run({ input, HeroReplay, Output }) {
          const hero = await HeroReplay.fromCrawler(datastore.crawlers.pageCrawler, {
            input: {
              url: input.url,
              // 24 hour cache
              maxTimeInCache: 60 * 60 * 24,
            },
          });

          const body = await hero.detachedElements.get('content');
          const url = new URL(input.url);

          let sectionName: string;
          let currentItem: (typeof Output)['Type'];
          for (const section of body.children) {
            if (section.tagName === 'H2') {
              sectionName = section.id?.trim().toLowerCase();
              continue;
            }
            if (section.tagName === 'H3') {
              if (currentItem) currentItem.emit();
              url.hash = section.querySelector('a').href;
              currentItem = new Output();
              currentItem.type = sectionName;
              currentItem.name = section.childNodes[1]?.textContent.trim();
              currentItem.link = url.href;
            }
            if (section.tagName === 'H4' && currentItem) {
              const id = section.id?.trim();
              if (!id) continue;
              if (id.startsWith('type') || id.startsWith('returns'))
                currentItem.returnType = section.querySelector('code')?.textContent;
              if (id.startsWith('arguments')) {
                const list = section.nextElementSibling;
                if (list?.tagName === 'UL') {
                  currentItem.args ??= [];
                  for (const li of list.children) {
                    if (li.tagName !== 'LI') continue;
                    currentItem.args.push({ name: 'unknown', type: 'unknown' });
                    const arg = currentItem.args[currentItem.args.length - 1];

                    let description = [];
                    for (let i = 0; i < li.childNodes.length; i += 1) {
                      const node = li.childNodes[i];
                      if (!node.textContent) continue;
                      if (i === 0) {
                        arg.name = node.textContent.trim();
                      } else if (node.nodeName === 'CODE') {
                        if (arg.type && description[0] === '|' && description.length === 1) {
                          description.length = 0;
                          arg.type += ' | ' + node.textContent;
                        } else {
                          arg.type = node.textContent;
                        }
                      } else if (node.textContent?.trim() === 'Optional') {
                        arg.optional = true;
                      } else {
                        description.push(node.textContent?.trim());
                      }
                    }
                    arg.description = description.join('\n').trim();
                    if (arg.description.includes('Optional')) arg.optional = true;
                    if (arg.description.startsWith('. '))
                      arg.description = arg.description.substr(2);
                  }
                }
              }
            }
            if (section.tagName === 'P' && currentItem) {
              currentItem.details ??= '';
              if (currentItem.details) currentItem.details += '\n\n';
              currentItem.details += section.textContent?.trim();
            }
          }

          await hero.close();
        },
        schema: {
          input: {
            url: string({ format: 'url' }),
          },
          inputExamples: [{ url: 'https://ulixee.org/docs/hero/advanced-client/tab' }],
          output: {
            type: string(),
            name: string(),
            link: string({ format: 'url' }),
            details: string({ description: 'The raw html body of the section' }),
            args: array({
              optional: true,
              element: object({
                name: string(),
                type: string(),
                optional: boolean({ optional: true }),
                description: string({ optional: true }),
              }),
            }),
            returnType: string({ optional: true }),
          },
        },
      },
      HeroRunnerPlugin,
    ),

    search: new Runner(
      {
        description: `Search the Ulixee documentation`,
        async run({ input, HeroReplay, Output }) {
          const heroReplay = await HeroReplay.fromCrawler(datastore.crawlers.searchCrawler, {
            input: {
              ...input,
              // 24 hour cache
              maxTimeInCache: 60 * 60 * 24,
            },
          });
          const searchBox = await heroReplay.detachedElements.get('results');

          for (const link of searchBox.querySelectorAll('.algolia-docsearch-suggestion')) {
            Output.emit({
              link: (link as any).href,
              match: link.querySelector('.algolia-docsearch-suggestion--title').textContent,
            });
          }
        },
        schema: {
          input: {
            query: string(),
          },
          output: {
            link: string({ format: 'url' }),
            match: string(),
          },
        },
      },
      HeroRunnerPlugin,
    ),
  },
});
export default datastore;
