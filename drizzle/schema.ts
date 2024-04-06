import { sql } from "drizzle-orm"
import {
  foreignKey,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"
import { nanoid } from "nanoid"

export const Post = sqliteTable("post", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid(11)),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const User = sqliteTable("user", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid(11)),
  name: text("name").notNull(),
})

export const Comment = sqliteTable(
  "comment",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => nanoid(11)),
    message: text("message").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => sql`CURRENT_TIMESTAMP`),

    userId: text("user_id")
      .notNull()
      .references(() => User.id),
    postId: text("post_id")
      .notNull()
      .references(() => Post.id),
    parentId: text("parent_id"),
  },
  (table) => ({
    parentChildFk: foreignKey(() => ({
      name: "parent_child_fk",
      columns: [table.parentId],
      foreignColumns: [table.id],
    })),
  })
)

export const Like = sqliteTable(
  "like",
  {
    userId: text("user_id")
      .notNull()
      .references(() => User.id),
    commentId: text("comment_id")
      .notNull()
      .references(() => Comment.id),
  },
  (table) => ({ pk: primaryKey({ columns: [table.userId, table.commentId] }) })
)
