import { useCallback, useEffect, useState } from "react";
import { pb } from "./pb";

/**
 * The bearer token Chat and Playground send to the gateway -- the signed-in
 * user's own PocketBase session token, not a separately minted API key.
 * Replaces the old `playgroundKey.ts`/`usePlaygroundKey.ts`, which cached a
 * minted key's plaintext in `localStorage`: that's inherently per-browser,
 * and since a key's plaintext is shown once and never stored server-side
 * (see pb_hooks/llm.pb.js), a second browser/device could never recover it
 * -- only get stuck, since minting a second default is refused and the
 * first one can't be revoked to make room either.
 *
 * A PocketBase session token has neither problem: it already works from any
 * browser signed into the same account (the auth cookie is shared across
 * every *.ryanzrau.dev subdomain -- see pb.ts/CookieAuthStore.ts) and is
 * kept alive automatically (`startAuthRefresh`). The gateway resolves it
 * server-side to that user's own auto-provisioned default `llm_api_keys`
 * row (pb_hooks/llm.pb.js's POST /keys/default) purely for usage
 * attribution -- this app never sees, mints, or caches that key itself.
 */
export function useGatewayAuth() {
  const [apiKey, setApiKey] = useState(pb.authStore.token || null);
  useEffect(() => pb.authStore.onChange((token) => setApiKey(token || null), true), []);

  // A 401 from the gateway most likely means the token went stale between
  // renders (the 5-minute refresh in pb.ts should prevent this in
  // practice) -- force a refresh and retry once with whatever comes back.
  // An unrecoverable failure (the underlying session itself expired) clears
  // the auth store, the same way startAuthRefresh's own failure handler
  // does, which naturally drops back to the login screen.
  const recoverFromUnauthorized = useCallback(async (): Promise<string | null> => {
    try {
      const res = await pb.collection("users").authRefresh();
      return res.token;
    } catch {
      pb.authStore.clear();
      return null;
    }
  }, []);

  return { apiKey, recoverFromUnauthorized };
}

export type GatewayAuthState = ReturnType<typeof useGatewayAuth>;
