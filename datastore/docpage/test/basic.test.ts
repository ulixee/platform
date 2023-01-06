import * as Fs from 'fs';
import * as Path from 'path';
import { buildDocpage } from '..';

test('can build docpage with custom config', async () => {
  const docpageDir = Path.join(__dirname, 'testsite');
  const config = {
    name: 'TestName',
    description: 'TestDescription',
  }
  try {
    expect(true).toBe(true);
    await buildDocpage(config, docpageDir);

    const jsDir = `${docpageDir}/js`;
    const jsIndexName = (Fs.readdirSync(jsDir)).find(x => x.match(/^index\.[^.]+\.js$/));
    const jsIndex = Fs.readFileSync(`${jsDir}/${jsIndexName}`, 'utf8');
    expect(jsIndex.includes(JSON.stringify(config))).toBe(true);
    Fs.rmSync(docpageDir, { recursive: true, force: true });
  } finally {
    if (Fs.existsSync(docpageDir)) Fs.rmSync(docpageDir, { recursive: true, force: true });
  }
});
