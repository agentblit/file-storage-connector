import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Pool } from "pg";

const cwd = process.cwd();
loadEnv({ path: resolve(cwd, ".env") });
loadEnv({ path: resolve(cwd, ".env.local"), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL for db:clean.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  await pool.query(`DROP SCHEMA IF EXISTS file_storage CASCADE`);
  await pool.query(`DROP SCHEMA IF EXISTS auth CASCADE`);
  await pool.query(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  console.log("Dropped file_storage, auth, and drizzle schemas");
} finally {
  await pool.end();
}

console.log("Run pnpm db:migrate (or pnpm dev) to re-apply migrations.");
