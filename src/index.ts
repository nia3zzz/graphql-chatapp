import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Context } from "hono";
import connectToDB from "./db/connToDB";
import { createYoga, createSchema } from "graphql-yoga";
import typeDefs from "./graphQL/typeDefs";
import { resolvers } from "./graphQL/resolvers";
import authRoutes from "./apis/authRoutes";
import { logger } from "hono/logger";
import verifyUserMiddleware from "./utils/verifyCookie";

const app = new Hono();

// run the graphql server
const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
  context: (context: { request: Request; userId?: string }) => {
    return {
      userId: (context as any).userId,
    };
  },
});

// logger middleware
app.use(logger());
app.use("/auth/*", verifyUserMiddleware);
app.use("/graphql", verifyUserMiddleware);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// add the auth route hono instance
app.route("/auth", authRoutes);

app.use(
  "/graphql",
  async (context: Context & { get(key: string): unknown }) => {
    const userId = context.get("userId") as string | undefined;
    (context.req.raw as any).userId = userId;
    return yoga.handle({
      request: context.req.raw,
      userId,
    });
  }
);

try {
  // run server and mongodb connection
  serve({
    fetch: app.fetch,
    port: Number(Bun.env.PORT) || 3000,
  });

  connectToDB();

  console.log(
    `Server running at http://localhost:${Number(Bun.env.PORT) || 3000}`
  );
} catch (error) {
  console.error("Error starting server:", error);
}
