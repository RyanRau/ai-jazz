import { css } from "goober";
import { useId } from "react";
import type { ReactNode } from "react";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";

/** Props every bluestar form control accepts. */
export type FormFieldProps = {
  /** Field label rendered above the control and wired to it via `htmlFor`. */
  label?: string;
  /** Helper text displayed beneath the label. */
  description?: string;
  /** Warning message shown below the control, in the warning colour. */
  warning?: string;
  /** Validation failure. Takes precedence over `warning` and sets `aria-invalid`. */
  error?: string;
  /** Marks the field required — shows an asterisk and sets the DOM attribute. */
  required?: boolean;
  /** Form field name. `useForm().field(name)` supplies this. */
  name?: string;
  isDisabled?: boolean;
  /**
   * Visually hides `label` (kept for screen readers, still wired via
   * `htmlFor`, via sr-only styling) instead of rendering it as visible
   * text — same idea as `Checkbox`'s own `hideLabel`. For a control whose
   * surrounding UI already conveys what it's for (an inline-editable page
   * title, say) where a floating caption above it would just add dead
   * space. Defaults to `false`.
   */
  hideLabel?: boolean;
};

export type FormInputLayoutProps = Omit<FormFieldProps, "name" | "isDisabled"> & {
  /**
   * Renders the control. Receives the ids to wire up so the label points at the
   * real element and screen readers announce the description and error.
   */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

const srOnly = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export default function FormInputLayout({
  label,
  description,
  warning,
  error,
  required,
  hideLabel = false,
  children,
}: FormInputLayoutProps) {
  const theme = useTheme();
  const id = useId();

  const descriptionId = description ? `${id}-description` : undefined;
  const messageId = error || warning ? `${id}-message` : undefined;
  const describedBy = [descriptionId, messageId].filter(Boolean).join(" ") || undefined;

  return (
    <Flexbox direction="column" gap={4}>
      {label && (
        // The <label> is the outer element: Text renders whatever tag `as` names
        // and does not forward htmlFor, so wrapping a <label> in a Text
        // as="label" would nest two labels — invalid, and the association goes
        // to whichever one the browser picks.
        <label htmlFor={id} className={hideLabel ? srOnly : undefined}>
          <Text as="span" variant="label">
            {label}
            {required && (
              <span aria-hidden="true" style={{ color: theme.colors.error }}>
                {" *"}
              </span>
            )}
          </Text>
        </label>
      )}
      {description && (
        <span id={descriptionId}>
          <Text variant="caption">{description}</Text>
        </span>
      )}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {(error || warning) && (
        <span id={messageId} role={error ? "alert" : undefined}>
          <Text variant="caption" color={error ? theme.colors.error : theme.colors.warning}>
            {error ?? warning}
          </Text>
        </span>
      )}
    </Flexbox>
  );
}
