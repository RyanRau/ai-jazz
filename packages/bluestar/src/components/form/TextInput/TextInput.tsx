import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  warning?: string;
  placeholder?: string;
  isDisabled?: boolean;
};

export default function TextInput({
  value,
  onChange,
  label,
  description,
  warning,
  placeholder,
  isDisabled,
}: TextInputProps) {
  const theme = useTheme();

  return (
    <FormInputLayout label={label} description={description} warning={warning}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isDisabled}
        className={css`
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
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
          &::placeholder {
            color: ${theme.colors.textMuted};
          }
          &:focus {
            border-color: ${theme.colors.primary};
            box-shadow: 0 0 0 2px ${theme.colors.primary}33;
          }
          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: ${theme.colors.surface};
          }
        `}
      />
    </FormInputLayout>
  );
}
