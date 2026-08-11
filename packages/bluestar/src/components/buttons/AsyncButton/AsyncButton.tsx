import { useState } from "react";
import Button from "../Button/Button";
import Spinner from "../../feedback/Spinner/Spinner";
import Text from "../../text/Text/Text";
import { useTheme } from "../../../theme";

type AsyncButtonProps = {
  /** The text label displayed inside the button. */
  label: string;
  /** Async function called on click. The button is disabled until the promise resolves or rejects. */
  onClick: () => Promise<void>;
};

export default function AsyncButton({ label, onClick }: AsyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

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
    <Button label={label} onClick={handleClick} isDisabled={loading}>
      <Text variant="label" color={theme.colors.light}>
        {label}
      </Text>
      {loading && <Spinner size={14} color={theme.colors.light} />}
    </Button>
  );
}
