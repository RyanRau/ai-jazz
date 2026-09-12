import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme, breakpoints } from "../../../theme";

export type StickyHeaderProps = {
  /** The header's own content -- title, actions, whatever a page needs pinned above its own scrolling content. */
  children: ReactNode;
};

/**
 * A sticky header for content living inside a `sideNav`-bearing
 * `AppShell`'s own scrolling `main` -- e.g. a chat's title/model/delete
 * row, pinned above the thread as it scrolls. Distinct from `AppShell`'s
 * own app-level header (branding/nav/account), which sits outside `main`
 * entirely and never needs this.
 *
 * `position: sticky; top: 0` alone isn't enough above `breakpoints.sm`
 * (desktop, where `AppShell`'s `showRail` is true and `main` itself is the
 * scroll container): `main` has its own `padding-top: 24px`, and a sticky
 * element's `top` offset is measured from the scrollport's *padding* edge,
 * not its true top -- so a plain `top: 0` sticks 24px below the actual top
 * of the viewport, leaving a permanent gap above it where scrolled content
 * paints straight through once you've scrolled past the first screen
 * (reproduced live: querying `elementFromPoint` in that gap returned the
 * scrolled-past content underneath, not a screenshot artifact). `top:
 * -24px` pulls the stuck position up to the scrollport's true edge,
 * `margin-top: -24px` pulls this component's own box up to match, and
 * `padding-top: 24px` restores the same visual gap before `children` that
 * `main`'s own padding would have given it anyway -- net zero at rest,
 * fixed once scrolled.
 *
 * Below `breakpoints.sm` (mobile, `AppShell`'s own `MOBILE_QUERY`
 * threshold), `sideNav` moves into a drawer and `showRail` is false --
 * `main` no longer scrolls, the whole page does, so its nearest sticky
 * containing block becomes the viewport, which has no such padding gap to
 * compensate for. Applying the same `-24px` offset there overcorrects,
 * clipping this component's own top content off-screen instead (caught by
 * reproducing it live at a mobile viewport width, not just assumed) --
 * so the compensation is gated to exactly the same breakpoint AppShell
 * itself switches `showRail` on. A small `padding-top` still applies below
 * that breakpoint (8px, vs. desktop's 24px) -- with none at all, this
 * sticks flush against the true top of the viewport, and a heading's own
 * line box can start exactly at that edge (confirmed via
 * `getBoundingClientRect`: `top: 0`, not just a screenshot crop), clipping
 * the tops of its glyphs against the screen edge with no room to spare.
 */
export default function StickyHeader({ children }: StickyHeaderProps) {
  const theme = useTheme();
  return (
    <div
      className={css`
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: ${theme.colors.background};
        padding-top: 8px;
        padding-bottom: 12px;
        border-bottom: 1px solid ${theme.colors.border};

        @media (min-width: ${breakpoints.sm + 1}px) {
          top: -24px;
          margin-top: -24px;
          padding-top: 24px;
        }
      `}
    >
      {children}
    </div>
  );
}
