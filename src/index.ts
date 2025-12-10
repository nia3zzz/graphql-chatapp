import { serve } from "@hono/node-server";
import { Hono } from "hono";
import connectToDB from "./db/connToDB";
import { createYoga, createSchema } from "graphql-yoga";
import typeDefs from "./graphQL/typeDefs";
import resolvers from "./graphQL/resolvers";
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

// mount the GraphQL server
app.use("/graphql", async (context) => {
  return yoga.handle({ request: context.req.raw });
});

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
