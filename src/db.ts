import { drizzle } from "drizzle-orm/bun-sqlite"
import * as schema from "@drizzle/schema"
import Database from "bun:sqlite"

const client = new Database(
  Bun.env.NODE_ENV === "production" ? "./sqlite.db" : "./drizzle/sqlite.db"
)
const db = drizzle(client, { schema, logger: true })

export default db
