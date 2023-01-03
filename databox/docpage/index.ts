import * as Fs from 'fs/promises';
import * as Path from 'path';
import * as FsExtra from 'fs-extra';

const distOutputDir = Path.resolve(__dirname, './dist');

export async function buildDocpage(config, outputDir): Promise<void> {
  FsExtra.copySync(distOutputDir, outputDir);
  const jsDir = `${outputDir}/js`;
  const indexJsName = (await Fs.readdir(jsDir)).find(x => x.match(/^index\.[^.]+\.js$/));
  
  let indexHtml = await Fs.readFile(`${outputDir}/index.html`, 'utf8');
  indexHtml = indexHtml.replace('Vue App', `${config.name} - Ulixee Datastore`);
  await Fs.writeFile(`${outputDir}/index.html`, indexHtml);

  let indexJs = await Fs.readFile(`${jsDir}/${indexJsName}`, 'utf8');
  indexJs = indexJs.replace('["$DATABOX_CONFIG_DATA"]', JSON.stringify(config));
  await Fs.writeFile(`${jsDir}/${indexJsName}`, indexJs);
}
