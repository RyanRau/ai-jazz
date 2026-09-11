import { css } from "goober";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTheme, breakpoints } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";
import Icon from "../../display/Icon/Icon";
import { SideNavMobileContext } from "../SideNav/SideNav";

const MOBILE_QUERY = `(max-width: ${breakpoints.sm}px)`;
const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";

export type AppShellProps = {
  /**
   * App name shown at the left of the header. Omit along with
   * `appSwitcher`/`nav`/`account` to skip the header entirely — the right
   * call once branding and an app switcher live in `SideNav`'s own `top`
   * slot instead, which reads as the app's real chrome the way a header
   * bar duplicating the same name doesn't.
   */
  title?: string;
  /** Rendered immediately after `title` — e.g. a `Menu`-based dropdown for switching between apps. */
  appSwitcher?: ReactNode;
  /** Nav links or buttons, placed right of the title. */
  nav?: ReactNode;
  /** Account/profile control, pinned to the true right edge of the header — rendered after `nav`. */
  account?: ReactNode;
  /**
   * A left rail (typically `SideNav`) locked to the true left edge, below
   * the header, spanning its own full height. When given, only `children`
   * scrolls — the header, sideNav, and footer stay put. Omit for the
   * default behavior (the whole page scrolls together), which every app
   * without this prop keeps exactly as before.
   */
  sideNav?: ReactNode;
  /**
   * Page content. Fills the available width by default when `sideNav` is
   * given (see `maxWidth`) — width-constrained and centred otherwise.
   */
  children: ReactNode;
  /** Optional footer below the content. */
  footer?: ReactNode;
  /**
   * Max content width in pixels, centring `children` (and `footer`) inside
   * it. Defaults to `960` for a plain page (no `sideNav`) — a document/form
   * reads better as a centred reading column than stretched edge to edge.
   * Defaults to unset (fills the available width) when `sideNav` is given:
   * that's a dashboard shell, not a document, and its content is already
   * flanked by the rail on one side — capping it too just leaves dead
   * space instead of anything resembling a centred column. Pass a number
   * either way to override.
   */
  maxWidth?: number;
};

/**
 * Full-width header (title pinned left, account control pinned right),
 * a content region below it (centred and width-capped, or full-width — see
 * `maxWidth`), optional footer.
 *
 * Exists so every app doesn't rebuild the same page chrome — and so they all
 * agree on content width and header treatment. The header intentionally
 * does NOT share the content column's max-width even when capped: a nav bar
 * reading as "centered in a lot of empty space" on a wide viewport is the
 * wrong look — real nav bars pin to the true edges of the viewport.
 */
export default function AppShell({
  title,
  appSwitcher,
  nav,
  account,
  sideNav,
  children,
  footer,
  maxWidth,
}: AppShellProps) {
  const theme = useTheme();
  const [isMobile, setIsMobile] = useState(
    () => canUseDOM && window.matchMedia(MOBILE_QUERY).matches
  );
  const [mobileNavRequestedOpen, setMobileNavRequestedOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!canUseDOM) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // Resizing back to desktop shouldn't leave the drawer primed to reopen
  // for whenever the viewport narrows again -- derived, not synced via its
  // own effect, so isMobile flipping back to false is enough on its own.
  const mobileNavOpen = mobileNavRequestedOpen && isMobile;

  // Same technique as Modal: showModal()/close() give focus trapping, the
  // top layer, and Esc-to-close for free.
  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (mobileNavOpen && !dialog.open) dialog.showModal();
    else if (!mobileNavOpen && dialog.open) dialog.close();
  }, [mobileNavOpen]);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    const handleClose = () => setMobileNavRequestedOpen(false);
    const handleCancel = (event: Event) => {
      event.preventDefault();
      setMobileNavRequestedOpen(false);
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, []);

  // The permanent rail only renders on a wide-enough viewport; on mobile the
  // same sideNav content moves into the drawer below instead.
  const showRail = Boolean(sideNav) && !isMobile;
  // Nothing to show up top -- an app with branding + an app switcher living
  // in SideNav's own `top` slot has no reason left for a second, redundant
  // bar repeating the same app name above it.
  const hasHeaderContent = Boolean(title || appSwitcher || nav || account);

  // An explicit maxWidth always wins; otherwise a plain page (no sideNav)
  // keeps the original centred-column default, while a dashboard shell
  // (sideNav given) gets no cap at all -- see the prop's own doc comment.
  const effectiveMaxWidth = maxWidth ?? (sideNav ? null : 960);

  // Raw CSS text, not a `css`-generated class name: `css()` returns a class
  // name string, and embedding that as literal text inside another `css`
  // template is invalid CSS that silently drops the whole declaration (this
  // is why `main` never actually got width-capped before — the class was
  // built but only ever wired up correctly for the footer's own div below).
  const centredRules = `
    width: 100%;
    ${effectiveMaxWidth ? `max-width: ${effectiveMaxWidth}px; margin: 0 auto;` : ""}
    padding: 0 16px;
  `;

  return (
    <div
      className={css`
        /* With a rendered rail, the shell itself is the scroll container's
           outer bound (exactly one viewport tall, nothing escapes it) so it
           and the header can stay fixed in place while only the body
           scrolls. Without one -- no sideNav, or sideNav moved into the
           mobile drawer -- this is unchanged: a normal page that scrolls as
           a whole. \`dvh\` (with a \`vh\` fallback for browsers that don't
           know it) tracks the *visible* viewport rather than the layout
           one, so this doesn't jump when a mobile on-screen keyboard opens
           and shrinks the visible area -- \`vh\` stays put and the fixed
           shell would otherwise sit partly behind the keyboard. */
        ${
          showRail
            ? "height: 100vh; height: 100dvh; overflow: hidden;"
            : "min-height: 100vh; min-height: 100dvh;"
        }
        display: flex;
        flex-direction: column;
        background-color: ${theme.colors.background};
        color: ${theme.colors.text};
      `}
    >
      {sideNav && isMobile && (
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileNavRequestedOpen(true)}
          className={css`
            position: fixed;
            top: 12px;
            left: 12px;
            z-index: 1;
            background-color: ${theme.colors.background};
            border: 1px solid ${theme.colors.border};
            box-shadow: ${theme.shadow.sm};
            cursor: pointer;
            display: flex;
            padding: 8px;
            border-radius: ${theme.radius.md};
            color: ${theme.colors.text};
            &:hover {
              background-color: ${theme.colors.surfaceHover};
            }
            &:focus-visible {
              outline: 2px solid ${theme.colors.focusRing};
              outline-offset: 2px;
            }
          `}
        >
          <Icon name="menu" size={20} />
        </button>
      )}

      {hasHeaderContent && (
        <header
          className={css`
            border-bottom: 1px solid ${theme.colors.border};
            background-color: ${theme.colors.surface};
            flex-shrink: 0;
            /* Vertical breathing room for when title+nav wrap to two lines on
               a narrow viewport — a fixed height would clip the wrapped row.
               Horizontal padding lives here (not on a centred inner wrapper)
               since the header itself now spans the full viewport width. */
            padding: 8px 16px;
          `}
        >
          <Flexbox
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={16}
            width="100%"
            style={{ minHeight: 56 }}
          >
            <Flexbox direction="row" alignItems="center" gap={4}>
              {title && <Header variant="h3">{title}</Header>}
              {appSwitcher}
            </Flexbox>
            {(nav || account) && (
              <Flexbox direction="row" alignItems="center" flexWrap="wrap" gap={16}>
                {nav}
                {account}
              </Flexbox>
            )}
          </Flexbox>
        </header>
      )}

      <div
        className={css`
          display: flex;
          flex: 1;
          ${showRail ? "overflow: hidden;" : ""}
        `}
      >
        {showRail && sideNav}
        <main
          className={css`
            ${centredRules}
            flex: 1;
            padding-top: 24px;
            padding-bottom: 24px;
            ${showRail ? "overflow-y: auto;" : ""}
          `}
        >
          {children}
        </main>
      </div>

      {sideNav && isMobile && (
        <dialog
          ref={drawerRef}
          aria-label="Navigation"
          onClick={(event) => {
            // The dialog covers the whole viewport, so a click landing on it
            // rather than on the panel inside means the backdrop was clicked.
            if (event.target === drawerRef.current) setMobileNavRequestedOpen(false);
          }}
          className={css`
            padding: 0;
            border: none;
            background: transparent;
            max-width: 100vw;
            max-height: 100vh;
            max-height: 100dvh;
            /* Overrides the browser default centering so the panel inside
               can sit flush against the true left edge instead. */
            margin: 0;
            height: 100vh;
            height: 100dvh;
            width: 100vw;

            &::backdrop {
              background-color: ${theme.colors.overlay};
            }
          `}
        >
          <div
            className={css`
              height: 100%;
              width: 100%;
              display: flex;
              flex-direction: column;
              box-shadow: ${theme.shadow.lg};
            `}
          >
            {/* A dedicated bar for the close control, rather than floating it
                over the panel -- the full-width drawer leaves no backdrop
                gutter to float it in, and overlaying it on SideNav's own
                content would collide with the `top` slot's own controls
                (e.g. an app switcher's own icon in the same corner).
                showModal() makes everything outside the dialog inert, so the
                header's own hamburger button is unreachable while this is
                open -- and there's no Escape key on a touchscreen, so this
                is the only way out besides tapping the backdrop. */}
            <div
              className={css`
                display: flex;
                justify-content: flex-end;
                flex-shrink: 0;
                padding: 8px;
                background-color: ${theme.colors.surface};
                border-bottom: 1px solid ${theme.colors.border};
              `}
            >
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavRequestedOpen(false)}
                className={css`
                  background: transparent;
                  border: 1px solid ${theme.colors.border};
                  cursor: pointer;
                  display: flex;
                  padding: 8px;
                  border-radius: ${theme.radius.md};
                  color: ${theme.colors.textMuted};
                  &:hover {
                    background-color: ${theme.colors.surfaceHover};
                  }
                  &:focus-visible {
                    outline: 2px solid ${theme.colors.focusRing};
                    outline-offset: 2px;
                  }
                `}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div
              className={css`
                flex: 1;
                min-height: 0;
                display: flex;
              `}
            >
              <SideNavMobileContext.Provider value={true}>{sideNav}</SideNavMobileContext.Provider>
            </div>
          </div>
        </dialog>
      )}

      {footer && (
        <footer
          className={css`
            border-top: 1px solid ${theme.colors.border};
            padding: 16px 0;
            flex-shrink: 0;
          `}
        >
          <div
            className={css`
              ${centredRules}
            `}
          >
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}
