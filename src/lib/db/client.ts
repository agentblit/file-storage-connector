import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/file-storage/schema";

type AppDb = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let dbInstance: AppDb | null = null;

function getDb(): AppDb {
  if (dbInstance) {
    return dbInstance;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }
  pool = new Pool({ connectionString });
  dbInstance = drizzle(pool, { schema });
  return dbInstance;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
