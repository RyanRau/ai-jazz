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
          // Two space-joined class names, not one `css` template with
          // `controlClass`'s result interpolated inside it: `controlClass`
          // already returns a generated *class name* (the output of its own
          // `css` call), and embedding a class name as literal text inside
          // another `css` template is invalid CSS that goober silently drops
          // -- the same mistake AppShell.tsx's `centredRules` comment
          // documents. That's how this textarea ended up on the browser's
          // default ~13px font (and everything else `controlClass` sets)
          // instead of the theme's, which is also what was triggering
          // iOS/Android's auto-zoom on focus below the 16px it guards for.
          className={`${controlClass(theme, { invalid, warning: Boolean(warning) })} ${css`
            resize: vertical;
            line-height: 1.5;
            &:disabled {
              resize: none;
            }
          `}`}
        />
      )}
    </FormInputLayout>
  );
}
