import { css } from "goober";
import { useId } from "react";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Text from "../../text/Text/Text";

export type RadioOption = {
  label: string;
  value: string;
  description?: string;
};

export type RadioGroupProps = FormFieldProps & {
  options: RadioOption[];
  /** `null` when nothing is selected yet. */
  value: string | null;
  onChange: (value: string) => void;
};

/** Pick exactly one of a small set. Use `Dropdown` past about six options. */
export default function RadioGroup({
  options,
  value,
  onChange,
  label,
  description,
  warning,
  error,
  required,
  name,
  isDisabled,
}: RadioGroupProps) {
  const theme = useTheme();
  const generatedName = useId();
  // Radios only behave as one group if they share a name attribute.
  const groupName = name ?? generatedName;

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ describedBy, invalid }) => (
        <div
          role="radiogroup"
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={css`
            display: flex;
            flex-direction: column;
            gap: 8px;
          `}
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={css`
                display: flex;
                align-items: flex-start;
                gap: 8px;
                cursor: ${isDisabled ? "not-allowed" : "pointer"};
                opacity: ${isDisabled ? 0.5 : 1};
              `}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={value === option.value}
                disabled={isDisabled}
                onChange={() => onChange(option.value)}
                className={css`
                  width: 16px;
                  height: 16px;
                  margin-top: 2px;
                  flex-shrink: 0;
                  cursor: inherit;
                  accent-color: ${theme.colors.primary};
                  &:focus-visible {
                    outline: 2px solid ${theme.colors.focusRing};
                    outline-offset: 2px;
                  }
                `}
              />
              <span>
                <Text variant="subtitle">{option.label}</Text>
                {option.description && <Text variant="caption">{option.description}</Text>}
              </span>
            </label>
          ))}
        </div>
      )}
    </FormInputLayout>
  );
}
