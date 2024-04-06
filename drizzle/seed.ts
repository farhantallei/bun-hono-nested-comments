import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { faker } from "@faker-js/faker"
import { Comment, Like, Post, User } from "./schema"

const migrationClient = new Database("./drizzle/sqlite.db")

async function main() {
  const db = drizzle(migrationClient)

  await db.delete(Post)
  await db.delete(User)

  const [farhan, sarah] = await db
    .insert(User)
    .values([{ name: "Farhan" }, { name: "Sarah" }])
    .returning()

  const [post1, post2] = await db
    .insert(Post)
    .values([
      { title: faker.vehicle.bicycle(), body: faker.lorem.text() },
      { title: faker.vehicle.bicycle(), body: faker.lorem.text() },
    ])
    .returning()

  const [, comment2, comment3] = await db
    .insert(Comment)
    .values([
      {
        message: faker.lorem.words(),
        userId: farhan.id,
        postId: post1.id,
      },
      {
        message: faker.lorem.words(),
        userId: sarah.id,
        postId: post1.id,
      },
      {
        message: faker.lorem.words(),
        userId: farhan.id,
        postId: post2.id,
      },
    ])
    .returning()

  await db.insert(Comment).values([
    {
      parentId: comment2.id,
      message: faker.lorem.words(),
      userId: farhan.id,
      postId: post1.id,
    },
    {
      parentId: comment3.id,
      message: faker.lorem.words(),
      userId: sarah.id,
      postId: post2.id,
    },
  ])

  await db.insert(Like).values([
    { userId: farhan.id, commentId: comment2.id },
    { userId: sarah.id, commentId: comment3.id },
  ])

  console.log("🌱  The seed command has been executed.")
}

main()
