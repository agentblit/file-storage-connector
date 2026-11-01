import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { Pool } from "pg";
import { agentblitOAuthConfig } from "@/lib/agentblit-oauth";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://127.0.0.1:5432/placeholder",
  options: "-c search_path=auth",
});

export const auth = betterAuth({
  baseURL: process.env.PUBLIC_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  advanced: {
    cookiePrefix: "file-storage-connector",
  },
  plugins: [
    genericOAuth({
      config: [agentblitOAuthConfig()],
    }),
    nextCookies(),
  ],
});
