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
  /** Value is shown and selectable but not editable — for a copyable
   *  read-only field like a generated link. Defaults to `false`. */
  readOnly?: boolean;
  /**
   * The HTML `autocomplete` hint (e.g. `"email"`, `"current-password"`,
   * `"new-password"`). Password managers key off this far more reliably
   * than off `type`/`name` alone — without it, autofill (including inside a
   * `Modal`'s `<dialog>`, which otherwise behaves like any other form) can
   * silently fail to offer saved credentials. Omit only for a field that
   * genuinely isn't part of a login/identity flow.
   */
  autoComplete?: string;
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
  readOnly,
  autoComplete,
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
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClass(theme, { invalid, warning: Boolean(warning) })}
        />
      )}
    </FormInputLayout>
  );
}
