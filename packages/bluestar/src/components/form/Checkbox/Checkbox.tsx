import { css } from "goober";
import { useId } from "react";
import { useTheme } from "../../../theme";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type CheckboxProps = Omit<FormFieldProps, "label"> & {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Text beside the box. Clicking it toggles the checkbox. */
  label: string;
};

/** A single boolean checkbox. Use `CheckboxList` for a set of options. */
export default function Checkbox({
  value,
  onChange,
  label,
  description,
  warning,
  error,
  required,
  name,
  isDisabled,
}: CheckboxProps) {
  const theme = useTheme();
  const id = useId();
  const messageId = error || warning ? `${id}-message` : undefined;

  return (
    <Flexbox direction="column" gap={4}>
      <label
        htmlFor={id}
        className={css`
          display: flex;
          align-items: center;
          gap: 8px;
          /* The label (not just the 16px box) is the tap target. */
          padding: 6px 0;
          cursor: ${isDisabled ? "not-allowed" : "pointer"};
          opacity: ${isDisabled ? 0.5 : 1};
        `}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={value}
          required={required}
          disabled={isDisabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={messageId}
          onChange={(e) => onChange(e.target.checked)}
          className={css`
            width: 16px;
            height: 16px;
            flex-shrink: 0;
            cursor: inherit;
            accent-color: ${theme.colors.primary};
            &:focus-visible {
              outline: 2px solid ${theme.colors.focusRing};
              outline-offset: 2px;
            }
          `}
        />
        <Text variant="subtitle">{label}</Text>
      </label>

      {description && <Text variant="caption">{description}</Text>}

      {(error || warning) && (
        <span id={messageId} role={error ? "alert" : undefined}>
          <Text variant="caption" color={error ? theme.colors.error : theme.colors.warning}>
            {error ?? warning}
          </Text>
        </span>
      )}
    </Flexbox>
  );
}
