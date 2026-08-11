import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

export type FormInputLayoutProps = {
  /** Field label displayed above the input. */
  label?: string;
  /** Helper text displayed beneath the label. */
  description?: string;
  /** Warning message displayed below the input in warning color. Overrides description. */
  warning?: string;
  children: ReactNode;
};

export default function FormInputLayout({
  label,
  description,
  warning,
  children,
}: FormInputLayoutProps) {
  const theme = useTheme();

  return (
    <Flexbox direction="column" gap={4}>
      {label && <Text variant="label">{label}</Text>}
      {description && <Text variant="caption">{description}</Text>}
      {children}
      {warning && (
        <Text variant="caption" color={theme.colors.warning}>
          {warning}
        </Text>
      )}
    </Flexbox>
  );
}
