import { ISelectorMap } from '@ulixee/desktop-interfaces/ISelectorMap';
import UlixeeConfig from '@ulixee/commons/config';
import IScriptInstanceMeta from '@ulixee/hero-interfaces/IScriptInstanceMeta';
import * as Fs from 'fs';
import * as Path from 'path';
import { existsAsync, readFileAsJson, safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';

interface ISavedSelectors {
  [url: string]: {
    [nodePath: string]: ISelectorMap;
  };
}

export default class SelectorRecommendations {
  private config: UlixeeConfig;
  private readonly projectPath: string;
  private readonly relativeScriptPath: string;

  constructor(private scriptMetadata: IScriptInstanceMeta) {
    this.config = UlixeeConfig.load(scriptMetadata);
    this.projectPath = this.findProjectPath();
    this.relativeScriptPath = Path.relative(
      `${this.projectPath}/..`,
      Path.resolve(scriptMetadata.entrypoint),
    );
  }

  public async save(map: ISelectorMap, url: string): Promise<void> {
    const configDirectory = this.config.directoryPath;
    const filename = this.getFilename();
    const selectorMapsPath = `${configDirectory}/selectors/${filename}.json`;
    let selectorMaps: ISavedSelectors = {};
    if (!(await existsAsync(Path.dirname(selectorMapsPath)))) {
      Fs.mkdirSync(Path.dirname(selectorMapsPath));
    } else {
      selectorMaps =
        (await readFileAsJson<ISavedSelectors>(selectorMapsPath).catch(() => null)) ?? {};
    }
    selectorMaps[url] ??= {};
    selectorMaps[url][map.nodePath] = map;
    await safeOverwriteFile(selectorMapsPath, JSON.stringify(selectorMaps));
  }

  private getFilename(): string {
    const entrypoint = this.scriptMetadata.entrypoint;

    return Path.basename(entrypoint)
      .replace(Path.extname(entrypoint), '')
      .replace(/[.]/g, '-')
      .toLowerCase();
  }

  private findProjectPath(): string {
    let last: string;
    let path = Path.resolve(this.scriptMetadata.workingDirectory);
    do {
      last = path;
      if (Fs.existsSync(Path.join(path, 'package.json'))) {
        return path;
      }
      path = Path.dirname(path);
    } while (path && path !== last);
  }
}
