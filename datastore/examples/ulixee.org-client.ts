import Client from '@ulixee/client';

async function query() {
  const client = new Client(`ulx://localhost:1818/tmp-ulixee-org@v0.0.1`);
  const results = await client.query(
    `SELECT title, href from docPages(tool => $1)
    order by title desc`,
    ['hero'],
  );

  console.log(results);

  await client.disconnect();
}

query().catch(console.error);
