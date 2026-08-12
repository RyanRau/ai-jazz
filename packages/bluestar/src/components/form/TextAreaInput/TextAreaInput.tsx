import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import { controlClass } from "../controlStyles";

export type TextAreaInputProps = FormFieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export default function TextAreaInput({
  value,
  onChange,
  label,
  description,
  warning,
  error,
  required,
  name,
  placeholder,
  rows = 4,
  isDisabled,
}: TextAreaInputProps) {
  const theme = useTheme();

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          name={name}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={css`
            ${controlClass(theme, { invalid, warning: Boolean(warning) })}
            resize: vertical;
            line-height: 1.5;
            &:disabled {
              resize: none;
            }
          `}
        />
      )}
    </FormInputLayout>
  );
}
