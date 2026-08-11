import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";

type NumberInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  description?: string;
  warning?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  isDisabled?: boolean;
};

export default function NumberInput({
  value,
  onChange,
  label,
  description,
  warning,
  placeholder,
  min,
  max,
  step,
  isDisabled,
}: NumberInputProps) {
  const theme = useTheme();

  return (
    <FormInputLayout label={label} description={description} warning={warning}>
      <input
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
