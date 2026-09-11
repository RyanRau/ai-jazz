import type { ReactNode } from "react";

/**
 * One drawing per app in the cross-app registry (`registry_apps` in
 * PocketBase — see `apps/pocketbase/README.md`), keyed by its `slug`, shared
 * by every app in the monorepo so a given app reads the same everywhere it's
 * shown: the signed-in `AppSwitcher`, a public "personal projects" page, an
 * apps dashboard. Add a new app here (not per-consuming-app) when it needs
 * to appear anywhere this renders — this is content bluestar can own
 * without depending on PocketBase itself: just static SVG geometry, no data
 * fetching.
 *
 * `"apps"` is a standing sentinel, not a real registry row — every app's
 * own switcher includes a link back to the shared app catalog, and reuses
 * `Icon`'s own `grid` glyph for it so the two read as the same "apps" mark
 * wherever they appear.
 *
 * Paths use `currentColor` rather than a baked-in hex so callers set the
 * color via CSS however fits their own context (a literal palette color on
 * a page outside the theme system, a theme token on a themed one) — see
 * `AppIcon`'s own `color` prop below.
 */
const appIcons: Record<string, ReactNode> = {
  apps: (
    <>
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
    </>
  ),
  stash: (
    <path
      d="M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  tony: (
    <>
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M9.5 7V4M14.5 7V4M9.5 20v-3M14.5 20v-3M7 9.5H4M7 14.5H4M20 9.5h-3M20 14.5h-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  bluestar: (
    <path
      d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
    />
  ),
};

/** Rendered for any slug not listed above — a plain generic mark rather than breaking the layout. */
const defaultAppIcon: ReactNode = (
  <rect
    x="4"
    y="4"
    width="16"
    height="16"
    rx="3"
    stroke="currentColor"
    strokeWidth="1.6"
    fill="none"
  />
);

export type AppIconProps = {
  /** A `registry_apps` slug (`"stash"`, `"tony"`, ...), or the `"apps"` catalog sentinel. */
  slug: string;
  /** Pixel size (square). Defaults to `24`. */
  size?: number;
  /** Defaults to `"currentColor"` so it inherits surrounding text/button color for free. */
  color?: string;
};

export default function AppIcon({ slug, size = 24, color }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={color ? { color } : undefined}
    >
      {appIcons[slug] ?? defaultAppIcon}
    </svg>
  );
}
