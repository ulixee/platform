import Client from '@ulixee/client';
import { inspect } from 'util';

inspect.defaultOptions.depth = 10;
async function main() {
  const client = new Client('ulx://localhost:1818/dbx1startedtempver0002');
  try {
    const result = await client.query('select * from docPages(tool => $1, pageName => $2)', ['hero', 'Tab']);
    console.log(result);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
