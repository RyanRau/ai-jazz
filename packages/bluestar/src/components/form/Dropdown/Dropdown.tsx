import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import { controlClass } from "../controlStyles";

export type DropdownOption = {
  label: string;
  value: string;
};

type BaseProps = FormFieldProps & {
  options: DropdownOption[];
  placeholder?: string;
};

type SingleProps = BaseProps & {
  multi?: false;
  value: string | null;
  onChange: (value: string | null) => void;
};

type MultiProps = BaseProps & {
  multi: true;
  value: string[];
  onChange: (value: string[]) => void;
};

export type DropdownProps = SingleProps | MultiProps;

export default function Dropdown(props: DropdownProps) {
  const theme = useTheme();
  const { options, label, description, warning, error, required, name, placeholder, isDisabled } =
    props;

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ id, describedBy, invalid }) => {
        const base = controlClass(theme, { invalid, warning: Boolean(warning) });
        const shared = {
          id,
          name,
          disabled: isDisabled,
          required,
          "aria-invalid": invalid || undefined,
          "aria-describedby": describedBy,
        };

        if (props.multi) {
          return (
            <select
              {...shared}
              multiple
              value={props.value}
              onChange={(e) => props.onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
              className={css`
                ${base}
                min-height: 100px;
                padding: 4px;
                cursor: pointer;
                & option {
                  padding: 4px 8px;
                  border-radius: ${theme.radius.sm};
                }
              `}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        return (
          <select
            {...shared}
            value={props.value ?? ""}
            onChange={(e) => props.onChange(e.target.value === "" ? null : e.target.value)}
            className={css`
              ${base}
              cursor: pointer;
            `}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }}
    </FormInputLayout>
  );
}
