import { pb } from "./pb";

const LABEL = "Tony Playground (auto)";

// Scoped by user id, not a single fixed key -- a shared browser signing in
// as a different PocketBase account must not reuse (and silently attribute
// usage to) the previous account's cached key.
function storageKey(userId: string) {
  return `tony-playground-key:${userId}`;
}

/**
 * The signed-in user's cached Playground key, or `null` if this browser
 * doesn't have one. Deliberately does *not* mint one when it's missing --
 * that used to happen automatically on every cache miss (a cleared cache, a
 * different browser or device), and since a default key's plaintext is
 * shown only once at creation and never stored server-side, every miss
 * minted a brand new one rather than recovering the existing one, leaving
 * users with several. Callers should show a prompt and call
 * `mintPlaygroundKey` explicitly instead -- see `usePlaygroundKey.ts`.
 */
export function getCachedPlaygroundKey(userId: string): string | null {
  return localStorage.getItem(storageKey(userId));
}

/**
 * Creates a new default key and caches it. The server refuses this if the
 * user already has an active default key (see pb_hooks/llm.pb.js) --
 * expected and surfaced to the caller as a rejected promise, not retried,
 * since retrying would just fail again for the same reason.
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
