import { css } from "goober";
import { useId } from "react";
import { useTheme } from "../../../theme";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type SwitchProps = Omit<FormFieldProps, "label"> & {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
};

/**
 * A toggle for a setting that takes effect immediately.
 *
 * Built on a real checkbox input so it keeps native keyboard and assistive-tech
 * behaviour; `role="switch"` tells screen readers it reads as on/off.
 */
export default function Switch({
  value,
  onChange,
  label,
  description,
  warning,
  error,
  name,
  isDisabled,
}: SwitchProps) {
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
          gap: 10px;
          cursor: ${isDisabled ? "not-allowed" : "pointer"};
          opacity: ${isDisabled ? 0.5 : 1};
        `}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          role="switch"
          checked={value}
          disabled={isDisabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={messageId}
          onChange={(e) => onChange(e.target.checked)}
          className={css`
            appearance: none;
            position: relative;
            width: 36px;
            height: 20px;
            flex-shrink: 0;
            margin: 0;
            border-radius: ${theme.radius.full};
            background-color: ${theme.colors.borderStrong};
            cursor: inherit;
            transition: background-color 0.15s ease;

            &::after {
              content: "";
              position: absolute;
              top: 2px;
              left: 2px;
              width: 16px;
              height: 16px;
              border-radius: ${theme.radius.full};
              background-color: ${theme.colors.background};
              transition: transform 0.15s ease;
            }

            &:checked {
              background-color: ${theme.colors.primary};
            }
            &:checked::after {
              transform: translateX(16px);
            }
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
