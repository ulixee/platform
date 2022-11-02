import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import sourcemaps from './sourcemaps';

const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

export default async function rollupDatabox(
  scriptPath: string,
  options: { tsconfig?: string; outDir?: string; dryRun?: boolean } = {},
): Promise<{ bytes: number; code: Buffer; sourceMap: string; modules: string[] }> {
  const outDir = options.outDir ?? `${__dirname}/../`;
  const plugins = [
    nodeResolve({
      resolveOnly: module =>
        !module.startsWith('@ulixee') &&
        !module.includes('/databox-for-') &&
        module !== 'awaited-dom',
    }),
    commonjs({ transformMixedEsModules: true, extensions: ['.js', '.ts'] }), // the ".ts" extension is required }),
    terser({ compress: false, mangle: false, format: { comments: false }, ecma: 2020 }),
  ];

  if (scriptPath.endsWith('.ts')) {
    plugins.unshift(
      typescript({
        compilerOptions: {
          composite: false,
          sourceMap: true,
          inlineSourceMap: false,
          inlineSources: true,
          declaration: false,
          checkJs: false,
        },
        outputToFilesystem: false,
        tsconfig: options?.tsconfig,
      }),
    );
  } else {
    plugins.unshift(sourcemaps());
  }

  try {
    // create a bundle
    const bundle = await rollup({
      input: scriptPath,
      plugins,
      onwarn: warning => {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'PREFER_NAMED_EXPORTS') return;
        if (warning.code === 'MIXED_EXPORTS') return;
        if (warning.plugin === 'typescript') {
          if (
            warning.message.includes(`your configuration specifies a "module" other than "esnext"`)
          )
            return;
        }
        console.warn(warning.message, warning.code);
      },
    });

    const outFn = options.dryRun ? 'generate' : 'write';
    const outFile = `${outDir}/databox.js`;
    const { output } = await bundle[outFn]({
      file: outFile,
      sourcemap: true,
      format: 'commonjs',
      generatedCode: 'es2015',
    });

    const [out] = output;
    const modules: string[] = [];
    for (const [module, details] of Object.entries(out.modules)) {
      if (details.renderedLength > 0) modules.push(module);
    }
    const code = Buffer.from(`${out.code}//# sourceMappingURL=databox.js.map\n`);
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
