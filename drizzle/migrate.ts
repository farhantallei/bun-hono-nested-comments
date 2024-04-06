import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { Database } from "bun:sqlite"

const migrationClient = new Database("./drizzle/sqlite.db")

async function main() {
  migrate(drizzle(migrationClient), {
    migrationsFolder: "./drizzle/migrations",
  })

  migrationClient.close()
}

main()
