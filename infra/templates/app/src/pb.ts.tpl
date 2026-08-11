import PocketBase from "pocketbase";

// The shared backend for every app in the monorepo. Collections and custom
// routes live in apps/pocketbase — see that app's README before adding either.
//
// VITE_PB_URL is only set for local development against a local instance; the
// production build falls back to the deployed backend.
export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? "https://api.ryanzrau.dev");

/** True once a user has authenticated; the SDK persists the token itself. */
export const isSignedIn = () => pb.authStore.isValid;
