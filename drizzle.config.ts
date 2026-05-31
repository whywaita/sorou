import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "dev",
    databaseId: "sorou-db-dev",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "dev",
  },
});
