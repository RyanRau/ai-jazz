import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [/^https:\/\/([a-z0-9-]+\.)?ryanzrau\.dev$/, /^http:\/\/localhost:\d+$/];

export const corsMiddleware = cors({
  origin: (origin) => (ALLOWED_ORIGINS.some((re) => re.test(origin)) ? origin : null),
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
});
