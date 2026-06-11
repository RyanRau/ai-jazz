import type { Context, Next } from "hono";
import { verifyAccessToken, type AuthUser } from "./tokens.js";

export type AuthEnv = { Variables: { user: AuthUser } };

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization" }, 401);
  }

  try {
    c.set("user", await verifyAccessToken(header.slice(7)));
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
}
