import { css } from "goober";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";

export type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A dense, single-select toggle group for picking one of a small set of
 * views (chart vs. table, a time range) — not a form field, so it takes no
 * `label`/`description`; wrap it in `FormInputLayout` if one is ever needed.
 * The selected segment lifts on a sunken track with a small functional
 * shadow, the same convention `SideNav`'s collapse handle uses — a
 * lift-to-indicate-state shadow, not an ambient card shadow.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <div
      role="radiogroup"
      className={css`
        display: inline-flex;
        gap: 2px;
        padding: 2px;
        border-radius: ${theme.radius.sm};
        background-color: ${theme.colors.surfaceHover};
      `}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={css`
              padding: 4px 10px;
              border: none;
              border-radius: calc(${theme.radius.sm} - 1px);
              background-color: ${selected ? theme.colors.background : "transparent"};
              box-shadow: ${selected ? theme.shadow.sm : "none"};
              cursor: pointer;

              &:focus-visible {
                outline: 2px solid ${theme.colors.focusRing};
                outline-offset: 2px;
              }
            `}
          >
            <Text variant="label" color={selected ? theme.colors.text : theme.colors.textMuted}>
              {option.label}
            </Text>
          </button>
        );
      })}
    </div>
  );
}
