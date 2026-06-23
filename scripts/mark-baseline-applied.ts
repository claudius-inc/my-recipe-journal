/**
 * One-time adoption helper for moving an existing (push-managed) database onto
 * the `drizzle-kit migrate` workflow.
 *
 * It records every migration currently in `drizzle/meta/_journal.json` as
 * already-applied in Drizzle's `__drizzle_migrations` bookkeeping table, so the
 * next `npm run db:migrate` is a clean no-op against a database whose schema is
 * already up to date. Safe to re-run: it never re-marks a migration twice.
 *
 * Run once after squashing to a fresh baseline:  npm run db:baseline
 *
 * A brand-new / empty database does NOT need this — just run `npm run db:migrate`.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const DRIZZLE_DIR = join(process.cwd(), "drizzle");

interface JournalEntry {
  tag: string;
  when: number;
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const journal = JSON.parse(
    readFileSync(join(DRIZZLE_DIR, "meta", "_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };

  // Drizzle's own DDL for the bookkeeping table (see drizzle-orm libsql migrator).
  await client.execute(
    `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )`,
  );

  const existing = await client.execute(`SELECT created_at FROM "${MIGRATIONS_TABLE}"`);
  const appliedMillis = new Set(existing.rows.map((r) => Number(r.created_at)));

  let inserted = 0;
  for (const entry of journal.entries) {
    if (appliedMillis.has(entry.when)) {
      console.log(`SKIP:  ${entry.tag} (already recorded)`);
      continue;
    }
    const sql = readFileSync(join(DRIZZLE_DIR, `${entry.tag}.sql`), "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    await client.execute({
      sql: `INSERT INTO "${MIGRATIONS_TABLE}" ("hash", "created_at") VALUES (?, ?)`,
      args: [hash, entry.when],
    });
    console.log(`MARK:  ${entry.tag} (created_at=${entry.when})`);
    inserted += 1;
  }

  console.log(`Done. ${inserted} migration(s) marked as applied.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
