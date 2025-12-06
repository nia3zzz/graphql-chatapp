import { serve } from "@hono/node-server";
import { Hono } from "hono";
import connectToDB from "./db/connToDB";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

try {
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
