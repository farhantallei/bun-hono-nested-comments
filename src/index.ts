import { Hono } from "hono"
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie"
import { HTTPException } from "hono/http-exception"

import db from "./db"
import { Comment, Like, Post, User } from "@drizzle/schema"
import { and, count, desc, eq, inArray } from "drizzle-orm"

type Variables = {
  user: {
    id: string
    name: string
  }
}

const app = new Hono<{ Variables: Variables }>()

// app.route("/", seed)

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

// User

app.get("/users", async (c) => {
  const users = await db.select({ id: User.id, name: User.name }).from(User)
  return c.json(users)
})

app.post("/users/:id", async (c) => {
  const id = c.req.param("id")

  await setSignedCookie(
    c,
    "nested-comments.user-id",
    id,
    Bun.env.COOKIE_SECRET!,
    { secure: true, sameSite: "Strict", httpOnly: true }
  )

  return c.text("OK")
})

app.delete("/users", async (c) => {
  deleteCookie(c, "nested-comments.user-id")

  return c.text("OK")
})

// Post

app.use("/posts/*", async (c, next) => {
  const userId = await getSignedCookie(
    c,
    Bun.env.COOKIE_SECRET!,
    "nested-comments.user-id"
  )

  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  const users = await db.select().from(User).where(eq(User.id, userId))

  if (!users.length) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  c.set("user", { id: userId, name: users[0].name })

  await next()
})

app.get("/posts", async (c) => {
  const posts = await db.select({ id: Post.id, title: Post.title }).from(Post)
  return c.json(posts)
})

app.get("/posts/:id", async (c) => {
  const id = c.req.param("id")

  const posts = await db
    .select({ id: Post.id, title: Post.title, body: Post.body })
    .from(Post)
    .where(eq(Post.id, id))

  if (!posts.length) {
    return c.notFound()
  }

  const comments = await db
    .select({
      id: Comment.id,
      message: Comment.message,
      parentId: Comment.parentId,
      createdAt: Comment.createdAt,
      userId: Comment.userId,
      name: User.name,
      likeCount: count(Like.commentId),
    })
    .from(Comment)
    .leftJoin(User, eq(Comment.userId, User.id))
    .leftJoin(Like, eq(Comment.id, Like.commentId))
    .where(eq(Comment.postId, posts[0].id))
    .groupBy(Comment.id)
    .orderBy(desc(Comment.createdAt))

  const likes = await db
    .select()
    .from(Like)
    .where(
      and(
        eq(Like.userId, c.get("user").id),
        inArray(
          Like.commentId,
          comments.map((comment) => comment.id)
        )
      )
    )

  return c.json({
    ...posts[0],
    comments: comments.map((comment) => {
      const { name, userId, ...rest } = comment
      return {
        ...rest,
        likedByMe: likes.find((like) => like.commentId === comment.id),
        user: { id: userId, name },
      }
    }),
  })
})

app.post("/posts/:id/comments", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json<{ message: string; parentId?: string }>()

  if (!body.message) {
    throw new HTTPException(400, { message: "Message is required" })
  }

  const comment = await db
    .insert(Comment)
    .values({
      message: body.message,
      userId: c.get("user").id,
      parentId: body.parentId,
      postId: id,
    })
    .returning({
      id: Comment.id,
      message: Comment.message,
      parentId: Comment.parentId,
      createdAt: Comment.createdAt,
    })

  return c.json({
    ...comment,
    user: c.get("user"),
    likeCount: 0,
    likedByMe: false,
  })
})

app.put("/posts/:postId/comments/:commentId", async (c) => {
  const commentId = c.req.param("commentId")
  const body = await c.req.json<{ message: string; parentId?: string }>()

  if (!body.message) {
    throw new HTTPException(400, { message: "Message is required" })
  }

  const comments = await db
    .select({ userId: Comment.userId })
    .from(Comment)
    .where(eq(Comment.id, commentId))

  if (!comments.length) {
    return c.notFound()
  }

  if (comments[0].userId !== c.get("user").id) {
    throw new HTTPException(403, {
      message: "You are not allowed to edit this comment",
    })
  }

  const [updatedComment] = await db
    .update(Comment)
    .set({ message: body.message })
    .where(eq(Comment.id, commentId))
    .returning({ message: Comment.message })

  return c.json(updatedComment)
})

app.delete("/posts/:postId/comments/:commentId", async (c) => {
  const commentId = c.req.param("commentId")

  const comments = await db
    .select({ userId: Comment.userId })
    .from(Comment)
    .where(eq(Comment.id, commentId))

  if (!comments.length) {
    return c.notFound()
  }

  if (comments[0].userId !== c.get("user").id) {
    throw new HTTPException(403, {
      message: "You are not allowed to delete this comment",
    })
  }

  const [deletedComment] = await db
    .delete(Comment)
    .where(eq(Comment.id, commentId))
    .returning({ id: Comment.id })

  return c.json(deletedComment)
})

app.post("/posts/:postId/comments/:commentId/like", async (c) => {
  const commentId = c.req.param("commentId")

  const likes = await db
    .select()
    .from(Like)
    .where(
      and(eq(Like.commentId, commentId), eq(Like.userId, c.get("user").id))
    )

  if (!likes.length) {
    await db.insert(Like).values({ userId: c.get("user").id, commentId })

    return c.json({ addLike: true })
  } else {
    await db
      .delete(Like)
      .where(
        and(eq(Like.commentId, commentId), eq(Like.userId, c.get("user").id))
      )

    return c.json({ addLike: false })
  }
})

export default {
  port: Bun.env.PORT,
  fetch: app.fetch,
}
