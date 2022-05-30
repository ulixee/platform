import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import * as Path from 'path';
import * as Fs from 'fs';
import { terser } from 'rollup-plugin-terser';

const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

export default async function rollupDatabox(
  input: string,
  options: { tsconfig?: string; outDir?: string; dryRun?: boolean } = {},
): Promise<{ bytes: number; code: Buffer; sourceMap: string; modules: string[] }> {
  const outDir = options.outDir ?? `${__dirname}/../`;

  const tsExtras = {};
  let tsconfig = options.tsconfig;
  if (!tsconfig && input.endsWith('.ts')) {
    tsconfig = findTsConfig(Path.dirname(input));
    console.log('Packaging Databox: tried to find tsconfig in directory structure', { tsconfig });
  }

  try {
    // create a bundle
    const bundle = await rollup({
      input,
      plugins: [
        nodeResolve({
          resolveOnly: module =>
            !module.startsWith('@ulixee') &&
            !module.startsWith('@unblocked-web') &&
            module !== 'awaited-dom',
        }),
        typescript({
          compilerOptions: {
            allowJs: true,
            module: 'esnext',
            sourceMap: true,
            inlineSources: true,
          },
          tsconfig,
          ...tsExtras,
        }),
        commonjs(),
        terser({ compress: false, mangle: false, format: { comments: false }, ecma: 2020 }),
      ],
    });

    const outFn = options.dryRun ? 'generate' : 'write';
    const outFile = outDir + '/databox.js';
    const { output } = await bundle[outFn]({
      file: outFile,
      sourcemap: true,
      format: 'commonjs',
      generatedCode: 'es2015',
      exports: 'default',
    });

    const [out] = output;
    if (!out.exports.includes('default')) {
      throw new Error(
        'The Databox being packaged needs to have a default export that implements the Databox Specification.',
      );
    }

    const modules: string[] = [];
    for (const [module, details] of Object.entries(out.modules)) {
      if (details.renderedLength > 0) modules.push(module);
    }
    const code = Buffer.from(out.code + '//# sourceMappingURL=databox.js.map\n' +
      '');
    const bytes = Buffer.byteLength(code);
    await bundle?.close();
    return {
      code,
      sourceMap: out.map.toString(),
      bytes,
      modules,
    };
  } catch (error) {
    if (error.code === 'INVALID_EXPORT_OPTION') {
      throw new Error(
        'The Databox being packaged needs to have a default export that implements the Databox Specification.',
      );
    }
    throw error;
  }
}

function findTsConfig(path: string): string {
  let last: string;
  do {
    last = path;
    if (Fs.existsSync(`${path}/tsconfig.json`)) {
      return `${path}/tsconfig.json`;
    }
    path = Path.dirname(path);
  } while (path && path !== last);
}
