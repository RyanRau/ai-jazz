import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";

export type AppShellProps = {
  /** App name shown at the left of the header. */
  title: string;
  /** Nav links or buttons, placed right of the title. */
  nav?: ReactNode;
  /** Account/profile control, pinned to the true right edge of the header — rendered after `nav`. */
  account?: ReactNode;
  /** Page content, width-constrained and centred. */
  children: ReactNode;
  /** Optional footer below the content. */
  footer?: ReactNode;
  /** Max content width in pixels. Defaults to `960`. */
  maxWidth?: number;
};

/**
 * Full-width header (title pinned left, account control pinned right),
 * centred content column below it, optional footer.
 *
 * Exists so every app doesn't rebuild the same page chrome — and so they all
 * agree on content width and header treatment. The header intentionally
 * does NOT share the content column's max-width: a nav bar reading as
 * "centered in a lot of empty space" on a wide viewport is the wrong look —
 * real nav bars pin to the true edges of the viewport.
 */
export default function AppShell({
  title,
  nav,
  account,
  children,
  footer,
  maxWidth = 960,
}: AppShellProps) {
  const theme = useTheme();

  const centred = css`
    width: 100%;
    max-width: ${maxWidth}px;
    margin: 0 auto;
    padding: 0 16px;
  `;

  return (
    <div
      className={css`
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: ${theme.colors.background};
        color: ${theme.colors.text};
      `}
    >
      <header
        className={css`
          border-bottom: 1px solid ${theme.colors.border};
          background-color: ${theme.colors.surface};
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
          <Header variant="h3">{title}</Header>
          {(nav || account) && (
            <Flexbox direction="row" alignItems="center" flexWrap="wrap" gap={16}>
              {nav}
              {account}
            </Flexbox>
          )}
        </Flexbox>
      </header>

      <main
        className={css`
          ${centred}
          flex: 1;
          padding-top: 24px;
          padding-bottom: 24px;
        `}
      >
        {children}
      </main>

      {footer && (
        <footer
          className={css`
            border-top: 1px solid ${theme.colors.border};
            padding: 16px 0;
          `}
        >
          <div className={centred}>{footer}</div>
        </footer>
      )}
    </div>
  );
}
