import type { KeyboardEvent } from "react";
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
  /** Passed straight through to the underlying `<input>` -- e.g. for an
   * inline-editable field where Enter commits and Escape cancels. */
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Focuses the input on mount -- e.g. a field that only appears once a
   *  "rename"/"edit" action reveals it, which should be ready to type into
   *  immediately rather than needing a second click. */
  autoFocus?: boolean;
  /** Fires on blur -- e.g. an inline-editable field that commits when focus
   *  leaves it, not just on Enter. */
  onBlur?: () => void;
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
  onKeyDown,
  hideLabel,
  autoFocus,
  onBlur,
}: TextInputProps) {
  const theme = useTheme();

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
      hideLabel={hideLabel}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={isDisabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClass(theme, { invalid, warning: Boolean(warning) })}
        />
      )}
    </FormInputLayout>
  );
}
