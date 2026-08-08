import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { Pool } from "pg";

const cwd = process.cwd();
loadEnv({ path: resolve(cwd, ".env") });
loadEnv({ path: resolve(cwd, ".env.local"), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL for auth migrate.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  options: "-c search_path=auth",
});

await pool.query(`CREATE SCHEMA IF NOT EXISTS auth`);

const auth = betterAuth({
  baseURL: process.env.PUBLIC_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET ?? "migrate-placeholder-secret",
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
});

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(
  auth.options,
);

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log("Auth migrations: up to date");
} else {
  console.log(
    `Auth migrations: creating ${toBeCreated.length} table(s), adding columns to ${toBeAdded.length} table(s)`,
  );
  await runMigrations();
  console.log("Auth migrations: done");
}

await pool.end();
