import Button from "../components/buttons/Button/Button";
import type { ButtonProps } from "../components/buttons/Button/Button";
import Spinner from "../components/feedback/Spinner/Spinner";
import Text from "../components/text/Text/Text";
import { useTheme } from "../theme";
import { useFormContext } from "./Form";

export type SubmitButtonProps = Omit<ButtonProps, "type" | "onClick"> & {
  /** Disable while the form has outstanding validation errors. Defaults to false. */
  disableWhenInvalid?: boolean;
};

/**
 * Submits the enclosing `<Form>`.
 *
 * This is what restoring `Button`'s native `type` bought us — the old API
 * repurposed `type` for visual intent, so a real submit button was impossible.
 */
export default function SubmitButton({
  label,
  isDisabled,
  disableWhenInvalid = false,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();
  const theme = useTheme();

  const disabled = isDisabled || form.isSubmitting || (disableWhenInvalid && !form.isValid);

  return (
    <Button {...props} type="submit" label={label} isDisabled={disabled}>
      <Text variant="label" color={theme.colors.textOnAccent}>
        {label}
      </Text>
      {form.isSubmitting && <Spinner size={14} color={theme.colors.textOnAccent} />}
    </Button>
  );
}
