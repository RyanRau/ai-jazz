import { css } from "goober";
import type { Theme } from "../../theme";

/**
 * Shared styling for the native control inside a form field.
 *
 * All five inputs render the same box; keeping it in one place is what stops
 * their focus rings, disabled states and error borders drifting apart.
 */
export function controlClass(
  theme: Theme,
  { invalid, warning }: { invalid?: boolean; warning?: boolean } = {}
) {
  const borderColor = invalid
    ? theme.colors.error
    : warning
      ? theme.colors.warning
      : theme.colors.border;

  return css`
    width: 100%;
    /* Never render narrower than a comfortable minimum, even inside a
       parent that collapses to content size (a flex item's implicit
       min-width: auto lets a width:100% child inside it shrink
       unpredictably) — matches the field-width floor Material Design,
       Ant Design, Chakra, Bootstrap, and shadcn/ui all converge on. */
    min-width: 240px;
    padding: 8px 12px;
    border: 1px solid ${borderColor};
    border-radius: ${theme.radius.md};
    background-color: ${theme.colors.background};
    color: ${theme.colors.text};
    font-family: ${theme.fonts.body};
    /* iOS Safari auto-zooms on focusing any input with a computed font-size
       below 16px — max() keeps the design size everywhere else while never
       going below the threshold that triggers it. */
    font-size: max(${theme.textTypes.subtitle.size}, 16px);
    outline: none;
    box-sizing: border-box;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;

    &::placeholder {
      color: ${theme.colors.textMuted};
    }

    &:focus-visible {
      border-color: ${invalid ? theme.colors.error : theme.colors.primary};
      outline: 2px solid ${theme.colors.focusRing};
      outline-offset: 1px;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: ${theme.colors.surface};
    }
  `;
}
