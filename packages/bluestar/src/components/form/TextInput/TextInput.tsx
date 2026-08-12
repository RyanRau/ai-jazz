import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import { controlClass } from "../controlStyles";

export type TextInputProps = FormFieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Input mode, e.g. "email" or "password". Defaults to "text". */
  type?: "text" | "email" | "password" | "url" | "tel";
};

export default function TextInput({
  value,
  onChange,
  label,
  description,
  warning,
  error,
  required,
  name,
  placeholder,
  type = "text",
  isDisabled,
}: TextInputProps) {
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
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClass(theme, { invalid, warning: Boolean(warning) })}
        />
      )}
    </FormInputLayout>
  );
}
