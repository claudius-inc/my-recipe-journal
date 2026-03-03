import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function backup() {
  // Get all table names
  const tables = await client.execute(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'
    ORDER BY name
  `);

  const backup: Record<string, unknown[]> = {};
  
  for (const row of tables.rows) {
    const tableName = row.name as string;
    const data = await client.execute(`SELECT * FROM "${tableName}"`);
    backup[tableName] = data.rows;
    console.error(`Exported ${tableName}: ${data.rows.length} rows`);
  }

  // Output as JSON
  console.log(JSON.stringify(backup, null, 2));
}

backup().catch(console.error);
