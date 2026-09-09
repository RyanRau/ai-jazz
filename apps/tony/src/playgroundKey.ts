import { pb } from "./pb";

const LABEL = "Tony Playground (auto)";

// Scoped by user id, not a single fixed key -- a shared browser signing in
// as a different PocketBase account must not reuse (and silently attribute
// usage to) the previous account's cached key.
function storageKey(userId: string) {
  return `tony-playground-key:${userId}`;
}

// Dedupes concurrent get-or-create calls for the same user within this page
// instance -- React StrictMode double-invokes effects in dev, so without
// this two calls that both see "nothing cached yet" each mint their own key
// (and PocketBase's SDK auto-cancels one of the two identical requests,
// since by default it keys on method+URL, surfacing as a request-aborted
// error on top of the wasted key).
const inFlight = new Map<string, Promise<string>>();

/** The signed-in user's own Playground key, minting one the first time. */
export async function getOrCreatePlaygroundKey(userId: string): Promise<string> {
  const cached = localStorage.getItem(storageKey(userId));
  if (cached) return cached;

  const existing = inFlight.get(userId);
  if (existing) return existing;

  const promise = mintPlaygroundKey(userId).finally(() => inFlight.delete(userId));
  inFlight.set(userId, promise);
  return promise;
}

/**
 * Always creates a new key and caches it, replacing whatever was cached.
 * Used both for the first-ever mint and to recover if the cached key was
 * revoked (e.g. from the Keys page) or the cache was cleared.
 */
export async function mintPlaygroundKey(userId: string): Promise<string> {
  const res = await pb.send<{ id: string; label: string; key: string }>("/api/custom/llm/keys", {
    method: "POST",
    body: { label: LABEL, is_default: true },
    requestKey: null,
  });
  localStorage.setItem(storageKey(userId), res.key);
  return res.key;
}

export function clearPlaygroundKey(userId: string) {
  localStorage.removeItem(storageKey(userId));
}
