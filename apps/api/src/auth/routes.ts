import { Hono } from "hono";
import { pool } from "../db.js";
import { requireAuth, type AuthEnv } from "./middleware.js";
import { verifyPassword } from "./passwords.js";
import {
  generateRefreshToken,
  getPublicJwks,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
  signAccessToken,
  type AuthUser,
} from "./tokens.js";

export const authRoutes = new Hono<AuthEnv>();

async function issueTokens(user: AuthUser) {
  const refreshToken = generateRefreshToken();
  await pool.query(
    `INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [user.id, hashRefreshToken(refreshToken), REFRESH_TOKEN_TTL_DAYS]
  );
  return {
    accessToken: await signAccessToken(user),
    refreshToken,
    user,
  };
}

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const { rows } = await pool.query(
    "SELECT id, email, password_hash FROM auth.users WHERE email = lower($1)",
    [email]
  );
  const row = rows[0];
  if (!row || !(await verifyPassword(row.password_hash, password))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  return c.json(await issueTokens({ id: row.id, email: row.email }));
});

authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => null);
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  if (!refreshToken) {
    return c.json({ error: "refreshToken is required" }, 400);
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const { rows } = await pool.query(
    `SELECT t.id, t.user_id, t.expires_at, t.revoked_at, u.email
     FROM auth.refresh_tokens t JOIN auth.users u ON u.id = t.user_id
     WHERE t.token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  if (row.revoked_at) {
    // Reuse of a rotated token — assume compromise, revoke the whole session family
    await pool.query(
      "UPDATE auth.refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
      [row.user_id]
    );
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  if (new Date(row.expires_at) < new Date()) {
    return c.json({ error: "Refresh token expired" }, 401);
  }

  await pool.query("UPDATE auth.refresh_tokens SET revoked_at = now() WHERE id = $1", [row.id]);
  return c.json(await issueTokens({ id: row.user_id, email: row.email }));
});

authRoutes.post("/logout", async (c) => {
  const body = await c.req.json().catch(() => null);
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  if (refreshToken) {
    await pool.query(
      "UPDATE auth.refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
      [hashRefreshToken(refreshToken)]
    );
  }
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, (c) => c.json({ user: c.get("user") }));

authRoutes.get("/jwks", async (c) => c.json(await getPublicJwks()));
