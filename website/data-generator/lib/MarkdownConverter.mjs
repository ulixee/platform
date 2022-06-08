import Fs from 'fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import remarkHeadingId from 'remark-heading-id';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { VFile } from 'vfile';
import {visit} from 'unist-util-visit'
import {h} from 'hastscript'

export default class MarkdownToHtml {
  constructor(filename) {
    const content = Fs.readFileSync(filename, 'utf-8');
    this.file = new VFile(content);
    this.processor = this.createProcessor();
  }

  createProcessor(options = {}) {
    return unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkHeadingId)
      // .use(this._remarkDebugging.bind(this))
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(this._rehypeFormatCodeBlocks.bind(this))
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        content(node) {
          return [{ type: 'text', value: '#' }];
        }
      })
      .use(this._rehypeExtractHeadings.bind(this))
      .use(rehypeStringify, { allowDangerousHtml: true });
  }

  async run() {
    this.title = '';
    this.subtitles = [];
    const parsed = this.processor.parse(this.file);
    const ran = await this.processor.run(parsed, this.file);
    return this.processor.stringify(ran, this.file)
  }

  _remarkDebugging() {
    return (tree) => {
      visit(tree, 'heading', (node) => {
        if (node.depth === 3) {
          console.log(node);
        }
      });
    }
  }

  _rehypeFormatCodeBlocks() {
    return (tree) => {
      visit(tree, 'element', (node) => {
        if (node.tagName === 'pre') {
          node.properties.className = node.properties.className || []; 
          node.properties.className.push('ulixeeTheme');
        }
      });
    }
  }

  _rehypeExtractHeadings() {
    return (tree) => {
      visit(tree, 'element', (node) => {
        if (node.tagName === 'h1') {
          this.title = this.title || extractInnerHtml(this.processor, node);
        } else if (['h2', 'h3'].includes(node.tagName)) {
          const value = extractInnerHtml(this.processor, node)
          const depth = Number(node.tagName.replace('h', ''));
          const anchor = `#${node.properties.id}`;
          this.subtitles.push({ depth, value, anchor });
        }
      });
    }
  }
}

function extractInnerHtml(processor, node) {
  node = { 
    ...node,
    children: node.children.filter(x => x.tagName !== 'a'),
   };
  const tag = processor.stringify(node)
  const matches = tag.match(/^<[^>]+>(.*)<\/[^>]+>$/);
  return matches ? matches[1] : '';
}