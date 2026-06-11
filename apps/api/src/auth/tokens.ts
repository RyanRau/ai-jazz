import { createHash, createPublicKey, randomBytes } from "node:crypto";
import {
  calculateJwkThumbprint,
  exportJWK,
  importPKCS8,
  jwtVerify,
  SignJWT,
  type CryptoKey,
  type JWK,
  type KeyObject,
} from "jose";

export interface AuthUser {
  id: string;
  email: string;
}

const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_DAYS = 30;

interface Keys {
  privateKey: CryptoKey | KeyObject;
  publicKey: KeyObject;
  publicJwk: JWK;
  issuer: string;
}

let keysPromise: Promise<Keys> | null = null;

async function loadKeys(): Promise<Keys> {
  const b64 = process.env.JWT_PRIVATE_KEY;
  if (!b64) throw new Error("JWT_PRIVATE_KEY is not set");

  const pem = Buffer.from(b64, "base64").toString("utf8");
  const privateKey = await importPKCS8(pem, "RS256");
  const publicKey = createPublicKey(pem);
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = await calculateJwkThumbprint(publicJwk);
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  return {
    privateKey,
    publicKey,
    publicJwk,
    issuer: process.env.JWT_ISSUER || "https://api.ryanzrau.dev",
  };
}

function getKeys(): Promise<Keys> {
  keysPromise ??= loadKeys();
  return keysPromise;
}

export async function getPublicJwks(): Promise<{ keys: JWK[] }> {
  const { publicJwk } = await getKeys();
  return { keys: [publicJwk] };
}

export async function signAccessToken(user: AuthUser): Promise<string> {
  const { privateKey, publicJwk, issuer } = await getKeys();
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
    .setSubject(user.id)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(privateKey);
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { publicKey, issuer } = await getKeys();
  const { payload } = await jwtVerify(token, publicKey, { issuer });
  return { id: payload.sub as string, email: payload.email as string };
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
