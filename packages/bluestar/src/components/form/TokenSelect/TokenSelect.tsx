import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Badge from "../../display/Badge/Badge";
import Icon from "../../display/Icon/Icon";
import Text from "../../text/Text/Text";
import Menu from "../../overlay/Menu/Menu";
import MenuItem from "../../overlay/MenuItem/MenuItem";

export type TokenOption = {
  label: string;
  value: string;
};

export type TokenSelectProps = FormFieldProps & {
  options: TokenOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Label on the "add" trigger. Defaults to "Add". */
  addLabel?: string;
};

/**
 * Selected values as removable pills, with a picker to add more from a
 * short, closed list of options — a discrete-choice tokenizer, not a
 * free-text/autocomplete one, since that's what every consumer of this so
 * far actually needs. Built from `Badge` (the pill) and `Menu`/`MenuItem`
 * (the add picker's popover) rather than new positioning code.
 */
export default function TokenSelect({
  options,
  value,
  onChange,
  addLabel = "Add",
  label,
  description,
  warning,
  error,
  required,
  isDisabled,
}: TokenSelectProps) {
  const theme = useTheme();
  const remaining = options.filter((o) => !value.includes(o.value));

  function remove(target: string) {
    onChange(value.filter((v) => v !== target));
  }

  function add(target: string) {
    onChange([...value, target]);
  }

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ describedBy, invalid }) => (
        // A group of tokens has no single control to label, same reasoning
        // CheckboxList's own group role/aria-label already establishes --
        // FormInputLayout's `id`/`htmlFor` has nothing to attach to here.
        <div
          role="group"
          aria-label={label}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={css`
            display: flex;
            flex-direction: row;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          `}
        >
          {value.map((v) => {
            const option = options.find((o) => o.value === v);
            if (!option) return null;
            return (
              <Badge key={v} variant="primary" emphasis="subtle">
                {option.label}
                {!isDisabled && (
                  <button
                    type="button"
                    aria-label={`Remove ${option.label}`}
                    onClick={() => remove(v)}
                    className={css`
                      display: inline-flex;
                      background: none;
                      border: none;
                      padding: 0;
                      margin-left: 2px;
                      cursor: pointer;
                      color: inherit;
                      border-radius: ${theme.radius.full};
                      &:focus-visible {
                        outline: 2px solid ${theme.colors.focusRing};
                        outline-offset: 2px;
                      }
                    `}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </Badge>
            );
          })}
          {!isDisabled && remaining.length > 0 && (
            <Menu
              width={200}
              trigger={
                <Text variant="label" color={theme.colors.primary}>
                  + {addLabel}
                </Text>
              }
              triggerLabel={addLabel}
            >
              <Flexbox direction="column" gap={4}>
                {remaining.map((option) => (
                  <MenuItem
                    key={option.value}
                    title={option.label}
                    onClick={() => add(option.value)}
                  />
                ))}
              </Flexbox>
            </Menu>
          )}
          {!isDisabled && remaining.length === 0 && value.length > 0 && (
            <Text variant="caption" color={theme.colors.textMuted}>
              All options selected
            </Text>
          )}
        </div>
      )}
    </FormInputLayout>
  );
}
