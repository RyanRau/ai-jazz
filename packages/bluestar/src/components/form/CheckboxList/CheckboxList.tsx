import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Text from "../../text/Text/Text";

export type CheckboxOption = {
  label: string;
  value: string;
};

export type CheckboxListProps = FormFieldProps & {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
};

export default function CheckboxList({
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
}: CheckboxListProps) {
  const theme = useTheme();

  function toggle(optionValue: string, checked: boolean) {
    onChange(checked ? [...value, optionValue] : value.filter((v) => v !== optionValue));
  }

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ describedBy, invalid }) => (
        // A group of checkboxes has no single control to label, so the group
        // carries the accessible name rather than FormInputLayout's htmlFor.
        <div
          role="group"
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
                align-items: center;
                gap: 8px;
                cursor: ${isDisabled ? "not-allowed" : "pointer"};
                opacity: ${isDisabled ? 0.5 : 1};
              `}
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={value.includes(option.value)}
                onChange={(e) => toggle(option.value, e.target.checked)}
                disabled={isDisabled}
                className={css`
                  width: 16px;
                  height: 16px;
                  cursor: ${isDisabled ? "not-allowed" : "pointer"};
                  accent-color: ${theme.colors.primary};
                  flex-shrink: 0;
                  &:focus-visible {
                    outline: 2px solid ${theme.colors.focusRing};
                    outline-offset: 2px;
                  }
                `}
              />
              <Text variant="subtitle">{option.label}</Text>
            </label>
          ))}
        </div>
      )}
    </FormInputLayout>
  );
}
