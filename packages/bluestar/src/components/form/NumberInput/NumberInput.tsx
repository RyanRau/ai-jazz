import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import { controlClass } from "../controlStyles";

export type NumberInputProps = FormFieldProps & {
  /** `null` when the field is empty — never `NaN`. */
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

export default function NumberInput({
  value,
  onChange,
  label,
  description,
  warning,
  error,
  required,
  name,
  placeholder,
  min,
  max,
  step,
  isDisabled,
}: NumberInputProps) {
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
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
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
