import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import SourceLoader from '@ulixee/commons/lib/SourceLoader';
import { Plugin } from 'rollup';

// Pre-process any existing source maps so they get flattened into the result
export default function sourcemaps(): Plugin {
  return {
    name: 'sourcemaps',
    load(id): Promise<{ code: string; map: any }> {
      const result = { code: null, map: null };
      try {
        result.code = SourceLoader.getFileContents(id, false);
        if (result.code === null) return null;
      } catch (_a) {
        return null;
      }
      try {
        const { map, rawMap } = SourceMapSupport.retrieveSourceMap(id);
        if (map) {
          if (rawMap.sourcesContent === undefined) {
            rawMap.sourcesContent = [...map.sourcesContent];
          }
          result.map = rawMap;
        }
      } catch (_b) {
        /* no-op */
      }
      return Promise.resolve(result);
    },
    watchChange() {
      SourceLoader.resetCache();
    },
  };
}
