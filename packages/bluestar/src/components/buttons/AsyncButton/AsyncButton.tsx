import { useState } from "react";
import Button, { resolveButtonTextColor } from "../Button/Button";
import type { ButtonProps } from "../Button/Button";
import Spinner from "../../feedback/Spinner/Spinner";
import Text from "../../text/Text/Text";
import { useTheme } from "../../../theme";

export type AsyncButtonProps = Omit<ButtonProps, "onClick"> & {
  /**
   * Async click handler. The button disables itself and shows a spinner until
   * the promise settles — including when it rejects.
   */
  onClick: () => Promise<void>;
};

export default function AsyncButton({
  label,
  onClick,
  isDisabled,
  variant = "primary",
  appearance = "solid",
  ...props
}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const textColor = resolveButtonTextColor(theme, variant, appearance);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      {...props}
      variant={variant}
      appearance={appearance}
      label={label}
      onClick={handleClick}
      isDisabled={loading || isDisabled}
    >
      <Text variant="label" color={textColor}>
        {label}
      </Text>
      {loading && <Spinner size={14} color={textColor} />}
    </Button>
  );
}
