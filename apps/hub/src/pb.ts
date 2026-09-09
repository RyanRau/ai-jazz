import PocketBase from "pocketbase";
import { CookieAuthStore } from "./CookieAuthStore";

// The shared backend for every app in the monorepo. Collections and custom
// routes live in apps/pocketbase — see that app's README before adding either.
//
// VITE_PB_URL is only set for local development against a local instance; the
// production build falls back to the deployed backend.
export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL ?? "https://api.ryanzrau.dev",
  new CookieAuthStore()
);

/** True once a user has authenticated; the SDK persists the token itself. */
export const isSignedIn = () => pb.authStore.isValid;

export const signOut = () => pb.authStore.clear();

// Tokens are kept short-lived (set the duration in the Admin UI: Collections
// → users → Options → auth token duration) to limit the blast radius of the
// cookie being readable across every *.ryanzrau.dev subdomain. This keeps a
// real session alive by refreshing it periodically while the tab is open.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
export function startAuthRefresh() {
  const refresh = () => {
    if (!pb.authStore.isValid) return;
    pb.collection("users")
      .authRefresh()
      .catch(() => pb.authStore.clear());
  };
  refresh();
  setInterval(refresh, REFRESH_INTERVAL_MS);
}
