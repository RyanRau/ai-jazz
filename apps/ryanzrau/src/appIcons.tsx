import type { ReactNode } from "react";

/**
 * Custom line icon per known app slug, shared between Landing.tsx's
 * Personal Projects section and App.tsx's Apps dashboard -- one drawing per
 * app regardless of which page shows it, instead of two copies drifting
 * apart. Uses `currentColor` rather than a hardcoded hex so each consumer
 * can color it however fits its own context (a literal palette color on
 * the bluestar-free Landing page, a theme token on the themed dashboard).
 */
export const appIcons: Record<string, ReactNode> = {
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

/** Rendered for any slug not in `appIcons` -- a plain generic mark rather than breaking the layout. */
export const defaultAppIcon: ReactNode = (
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

/** `size`/`color` are plain SVG attributes -- `color` sets the CSS `color` the paths' `currentColor` resolves against. */
export function AppIcon({
  slug,
  size = 24,
  color,
}: {
  slug: string;
  size?: number;
  color?: string;
}) {
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
