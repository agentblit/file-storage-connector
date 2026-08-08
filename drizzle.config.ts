import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { Config } from "drizzle-kit";

const cwd = process.cwd();
loadEnv({ path: resolve(cwd, ".env") });
loadEnv({ path: resolve(cwd, ".env.local"), override: !process.env.DATABASE_URL });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL for drizzle config.");
}

export default {
  dialect: "postgresql",
  schema: "./src/lib/file-storage/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: connectionString },
} satisfies Config;
