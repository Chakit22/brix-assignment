type ExtensionClient = {
  query: (sql: string) => Promise<unknown>;
};

export async function ensureExtensions(client: ExtensionClient): Promise<void> {
  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await client.query('CREATE EXTENSION IF NOT EXISTS "btree_gist";');
}
