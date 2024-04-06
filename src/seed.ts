import { Hono } from "hono"
import db from "./db"
import { faker } from "@faker-js/faker"
import { Comment, Post, User } from "@drizzle/schema"

const seed = new Hono()

seed.get("/seed", async (c) => {
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

  return c.text("🌱  The seed command has been executed.")
})

export default seed
