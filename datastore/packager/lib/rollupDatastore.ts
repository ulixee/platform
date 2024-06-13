import { rollup, RollupBuild, RollupOptions, watch } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import json from  "@rollup/plugin-json";
import Resolvable from '@ulixee/commons/lib/Resolvable';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import sourcemaps from './sourcemaps';

const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

interface IRollupEvents {
  change: { code: string; sourceMap: string };
}

export default async function rollupDatastore(
  scriptPath: string,
  options: { tsconfig?: string; outDir?: string; dryRun?: boolean; watch?: boolean } = {},
): Promise<{
  code: string;
  sourceMap: string;
  modules: string[];
  events: TypedEventEmitter<IRollupEvents>;
  close: () => Promise<void>;
}> {
  const outDir = options.outDir ?? `${__dirname}/../`;
  const plugins = [
    nodeResolve({
      resolveOnly: module => {
        return !module.startsWith('@ulixee');
      },
    }),
    commonjs({ transformMixedEsModules: true, extensions: ['.js', '.ts'] }), // the ".ts" extension is required }),
    json(),
  ];

  if (scriptPath.endsWith('.ts')) {
    plugins.unshift(
      replace({
        preventAssignment: true,
        values: {
          'import * as moment': 'import moment',
        },
      }),
      typescript({
        compilerOptions: {
          composite: false,
          sourceMap: true,
          inlineSourceMap: false,
          inlineSources: true,
          declaration: false,
          checkJs: false,
          target: 'ES2021',
        },
        outputToFilesystem: false,
        tsconfig: options?.tsconfig,
      }),
    );
  } else {
    plugins.unshift(sourcemaps());
  }

  const outFile = `${outDir}/datastore.js`;
  const emitter = new TypedEventEmitter<IRollupEvents>();
  const resolvable = new Resolvable<{
    code: string;
    sourceMap: string;
    modules: string[];
    events: typeof emitter;
    close: () => Promise<void>;
  }>();
  try {
    const config: RollupOptions = {
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
          if (warning.message.includes("'#private' is missing in type")) return;
        }
        console.warn(warning.frame, warning.message, warning.code);
      },
    };

    // eslint-disable-next-line no-inner-declarations
    async function emitSource(build: RollupBuild, onClose?: () => Promise<void>): Promise<void> {
      const outFn = options.dryRun ? 'generate' : 'write';
      const { output } = await build[outFn]({
        file: outFile,
        sourcemap: true,
        sourcemapFile: 'datastore.js.map',
        format: 'cjs',
        generatedCode: 'es2015',
      });

      const [out] = output;

      if (options.watch && resolvable.isResolved) {
        console.log('Reloading Datastore');
        emitter.emit('change', {
          code: out.code,
          sourceMap: out.map.toString(),
        });
      }

      const modules: string[] = [];
      for (const [module, details] of Object.entries(out.modules)) {
        if (details.renderedLength > 0) modules.push(module);
      }
      resolvable.resolve({
        code: out.code,
        sourceMap: out.map.toString(),
        modules,
        events: emitter,
        close: () => onClose?.(),
      });
    }

    if (!options.watch) {
      const build = await rollup(config);
      await emitSource(build);
      await build.close();
    } else {
      // create a bundle
      const watcher = watch({
        ...config,
        watch: {
          skipWrite: true,
          clearScreen: false,
          buildDelay: 200,
        },
      });

      watcher.on('event', async ev => {
        if (ev.code === 'ERROR') {
          resolvable.reject(ev.error as any);
          await watcher.close();
        }
        if (ev.code === 'BUNDLE_END') {
          await emitSource(ev.result, watcher.close.bind(watcher));
        }
        if ('result' in ev && ev.result) {
          await ev.result.close();
        }
      });
    }
  } catch (error) {
    if (error.code === 'INVALID_EXPORT_OPTION') {
      // eslint-disable-next-line no-ex-assign
      error = new Error(
        'The Datastore being packaged needs to have a default export that implements the Datastore Specification.',
      );
    }
    resolvable.reject(error);
  }
  return await resolvable.promise;
}
