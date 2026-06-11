import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { authRoutes } from "./auth/routes.js";
import { corsMiddleware } from "./middleware/cors.js";
import { runMigrations } from "./migrate.js";
import { wallyRoutes } from "./wally/routes.js";

const app = new Hono();

app.use("*", logger());
app.use("*", corsMiddleware);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRoutes);
app.route("/wally", wallyRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

await runMigrations();

const port = parseInt(process.env.PORT || "3002", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`api listening on port ${port}`);
});
