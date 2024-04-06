import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "better-sqlite",
  dbCredentials: {
    url: "./drizzle/sqlite.db",
  },
  verbose: true,
  strict: true,
})
