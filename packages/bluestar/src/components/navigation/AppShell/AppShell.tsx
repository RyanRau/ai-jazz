import { css } from "goober";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Header from "../../text/Header/Header";

export type AppShellProps = {
  /** App name shown at the left of the header. */
  title: string;
  /** Nav links or buttons, placed at the right of the header. */
  nav?: ReactNode;
  /** Page content, width-constrained and centred. */
  children: ReactNode;
  /** Optional footer below the content. */
  footer?: ReactNode;
  /** Max content width in pixels. Defaults to `960`. */
  maxWidth?: number;
};

/**
 * Header, centred content column, optional footer.
 *
 * Exists so every app doesn't rebuild the same page chrome — and so they all
 * agree on content width and header treatment.
 */
export default function AppShell({ title, nav, children, footer, maxWidth = 960 }: AppShellProps) {
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
        `}
      >
        <div className={centred}>
          <Flexbox
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={16}
            height={56}
          >
            <Header variant="h3">{title}</Header>
            {nav && (
              <Flexbox direction="row" alignItems="center" gap={16}>
                {nav}
              </Flexbox>
            )}
          </Flexbox>
        </div>
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
