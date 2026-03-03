/**
 * Migration script to update ingredient roles from old schema to new schema
 * 
 * Old roles: flour, liquid, preferment, salt, sweetener, fat, add_in, spice, other
 * New roles: flour, liquid, leavening, salt, sweetener, fat, other
 * 
 * Mappings:
 * - preferment → leavening
 * - add_in → other
 * - spice → other
 */

import { createClient } from "@libsql/client";

async function migrate() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  console.log("Starting ingredient role migration...\n");

  // Count affected rows first
  const counts = await client.batch([
    "SELECT COUNT(*) as count FROM ingredients WHERE role = 'preferment'",
    "SELECT COUNT(*) as count FROM ingredients WHERE role = 'add_in'",
    "SELECT COUNT(*) as count FROM ingredients WHERE role = 'spice'",
  ]);

  const prefermentCount = (counts[0].rows[0] as { count: number }).count;
  const addInCount = (counts[1].rows[0] as { count: number }).count;
  const spiceCount = (counts[2].rows[0] as { count: number }).count;

  console.log(`Found:`);
  console.log(`  - ${prefermentCount} ingredients with role 'preferment' → will become 'leavening'`);
  console.log(`  - ${addInCount} ingredients with role 'add_in' → will become 'other'`);
  console.log(`  - ${spiceCount} ingredients with role 'spice' → will become 'other'`);
  console.log("");

  if (prefermentCount === 0 && addInCount === 0 && spiceCount === 0) {
    console.log("No migration needed - all roles are already up to date!");
    return;
  }

  // Perform the updates
  console.log("Updating roles...");
  
  const results = await client.batch([
    "UPDATE ingredients SET role = 'leavening' WHERE role = 'preferment'",
    "UPDATE ingredients SET role = 'other' WHERE role = 'add_in'",
    "UPDATE ingredients SET role = 'other' WHERE role = 'spice'",
  ]);

  console.log(`\nMigration complete!`);
  console.log(`  - Updated ${results[0].rowsAffected} preferment → leavening`);
  console.log(`  - Updated ${results[1].rowsAffected} add_in → other`);
  console.log(`  - Updated ${results[2].rowsAffected} spice → other`);
}

migrate().catch(console.error);
