import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";

export type DropdownOption = {
  label: string;
  value: string;
};

type BaseProps = {
  options: DropdownOption[];
  label?: string;
  description?: string;
  warning?: string;
  placeholder?: string;
  isDisabled?: boolean;
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
  const { options, label, description, warning, placeholder, isDisabled } = props;

  const selectClass = css`
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${warning ? theme.colors.warning : theme.colors.border};
    border-radius: ${theme.radius};
    background-color: ${theme.colors.background};
    color: ${theme.colors.text};
    font-family: ${theme.fonts.body};
    font-size: ${theme.textTypes.subtitle.size};
    outline: none;
    box-sizing: border-box;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
    &:focus {
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 2px ${theme.colors.primary}33;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: ${theme.colors.surface};
    }
  `;

  if (props.multi) {
    return (
      <FormInputLayout label={label} description={description} warning={warning}>
        <select
          multiple
          value={props.value}
          disabled={isDisabled}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (o) => o.value);
            props.onChange(selected);
          }}
          className={css`
            ${selectClass}
            min-height: 100px;
            padding: 4px;
            & option {
              padding: 4px 8px;
              border-radius: 4px;
            }
          `}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormInputLayout>
    );
  }

  return (
    <FormInputLayout label={label} description={description} warning={warning}>
      <select
        value={props.value ?? ""}
        disabled={isDisabled}
        onChange={(e) => {
          const v = e.target.value;
          props.onChange(v === "" ? null : v);
        }}
        className={selectClass}
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
    </FormInputLayout>
  );
}
