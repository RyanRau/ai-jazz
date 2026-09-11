import { useCallback, useState } from "react";
import { useAuthRecord } from "./useAuth";
import { getCachedPlaygroundKey, mintPlaygroundKey, clearPlaygroundKey } from "./playgroundKey";

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/**
 * The signed-in user's Playground key -- shared by ChatPage (via
 * `useChat.ts`) and PlaygroundPage, since both need the same "do we have a
 * usable key" state and the same recovery flow rather than each minting
 * independently.
 *
 * Does not mint automatically: `needsKey` goes true once this browser's
 * cache has come up empty, and it's up to the caller to show that as a
 * warning with a button wired to `createKey` -- see pb_hooks/llm.pb.js's
 * is_default guard for why minting silently on every cache miss (the old
 * behavior) let default keys pile up per user.
 *
 * `mintedKey` -- rather than re-reading `localStorage` into its own
 * `useState` synced via an effect -- is the only state this hook keeps: the
 * localStorage read is synchronous and cheap, so `apiKey` is just derived
 * from it plus this session's own mint/recover result on every render,
 * which is both simpler and avoids a set-state-in-effect render cascade for
 * what's ultimately a pure computation.
 */
export function usePlaygroundKey() {
  const record = useAuthRecord();
  const [mintedKey, setMintedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const cachedKey = record ? getCachedPlaygroundKey(record.id) : null;
  const apiKey = mintedKey ?? cachedKey;
  const needsKey = record !== null && apiKey === null;

  const createKey = useCallback(async () => {
    if (!record) return;
    setCreating(true);
    setKeyError(null);
    try {
      setMintedKey(await mintPlaygroundKey(record.id));
    } catch (e) {
      setKeyError(errorMessage(e, "Couldn't create your key. Try again."));
    } finally {
      setCreating(false);
    }
  }, [record]);

  // The gateway rejected the cached key outright (401) -- it's known-bad, so
  // clear it and mint a replacement. Safe to do without asking first, unlike
  // the cold-start case above: the server refuses a second active default,
  // so this either recovers a key that was genuinely deleted server-side, or
  // surfaces that refusal as a clear error instead of silently minting
  // another one.
  const recoverFromUnauthorized = useCallback(async (): Promise<string | null> => {
    if (!record) return null;
    clearPlaygroundKey(record.id);
    setMintedKey(null);
    try {
      const key = await mintPlaygroundKey(record.id);
      setMintedKey(key);
      return key;
    } catch (e) {
      setKeyError(errorMessage(e, "Couldn't refresh your key. Try again."));
      return null;
    }
  }, [record]);

  return {
    apiKey,
    needsKey,
    creating,
    keyError,
    createKey,
    recoverFromUnauthorized,
  };
}

export type PlaygroundKeyState = ReturnType<typeof usePlaygroundKey>;
