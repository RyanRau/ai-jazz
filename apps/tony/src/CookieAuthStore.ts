import { BaseAuthStore, type AuthRecord } from "pocketbase";

const COOKIE_KEY = "pb_auth";
const COOKIE_DOMAIN = ".ryanzrau.dev";

/**
 * Persists the PocketBase auth token as a cookie instead of the SDK's default
 * localStorage, so logging in on one *.ryanzrau.dev subdomain authenticates
 * every other one on next page load — no redirect dance. Accepted trade-off:
 * this widens XSS blast radius versus per-origin localStorage (a bug in any
 * one app's JS can expose a token valid everywhere); mitigated with a short
 * auth token duration (set in the PocketBase Admin UI) plus periodic
 * authRefresh (see startAuthRefresh in pb.ts), not by narrowing the cookie's
 * reach. The cookie is not (and cannot be) HttpOnly — the SDK needs to read
 * the token back out in JavaScript to send it as an Authorization header.
 */
export class CookieAuthStore extends BaseAuthStore {
  constructor() {
    super();
    if (typeof document !== "undefined") {
      this.loadFromCookie(document.cookie, COOKIE_KEY);
    }
  }

  save(token: string, record?: AuthRecord) {
    super.save(token, record);
    this.persist();
  }

  clear() {
    super.clear();
    this.persist();
  }

  private persist() {
    const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    document.cookie = this.exportToCookie(
      {
        httpOnly: false, // the SDK's default (true) is a no-op from document.cookie anyway
        secure: !isLocal, // browsers reject Secure cookies over plain http
        sameSite: "Lax",
        domain: isLocal ? undefined : COOKIE_DOMAIN, // can't scope to .ryanzrau.dev from localhost
        path: "/",
        maxAge: this.token ? 60 * 60 * 24 * 7 : -1,
      },
      COOKIE_KEY
    );
  }
}
